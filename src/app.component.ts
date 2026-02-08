
import { Component, signal, computed, inject, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIService, Recipe } from './services/ai.service';
import { VoiceService } from './services/voice.service';

type AppState = 'home' | 'scanning' | 'recipes' | 'cooking' | 'shopping';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private aiService = inject(AIService);
  public voiceService = inject(VoiceService);

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  state = signal<AppState>('home');
  loading = signal(false);
  loadingText = signal('Analyzing your fridge...');
  
  fridgeIngredients = signal<string[]>([]);
  recipes = signal<Recipe[]>([]);
  shoppingList = signal<string[]>([]);
  
  selectedDiet = signal<string>('All');
  dietaryOptions = ['All', 'Vegetarian', 'Keto', 'Vegan', 'Gluten-Free', 'Low-Carb'];

  currentRecipe = signal<Recipe | null>(null);
  currentStepIndex = signal(0);

  filteredRecipes = computed(() => {
    const diet = this.selectedDiet();
    const list = this.recipes();
    if (diet === 'All') return list;
    return list.filter(r => r.dietaryTags.some(tag => tag.toLowerCase() === diet.toLowerCase()));
  });

  async startScanning() {
    this.state.set('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (this.videoPlayer) {
        this.videoPlayer.nativeElement.srcObject = stream;
        this.videoPlayer.nativeElement.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Camera access is required to scan your fridge.');
      this.state.set('home');
    }
  }

  async captureAndAnalyze() {
    const video = this.videoPlayer.nativeElement;
    const canvas = this.canvas.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
    
    // Stop camera
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());

    this.loading.set(true);
    this.state.set('recipes');

    try {
      const result = await this.aiService.analyzeFridge(base64Image);
      this.fridgeIngredients.set(result.ingredients);
      this.recipes.set(result.recipes);
    } catch (err) {
      console.error('Analysis failed', err);
      alert('Could not analyze the fridge. Please try again.');
      this.state.set('home');
    } finally {
      this.loading.set(false);
    }
  }

  selectRecipe(recipe: Recipe) {
    this.currentRecipe.set(recipe);
    this.currentStepIndex.set(0);
    this.state.set('cooking');
    this.speakStep(0);
  }

  speakStep(index: number) {
    const recipe = this.currentRecipe();
    if (recipe && recipe.steps[index]) {
      this.voiceService.speak(`Step ${index + 1}. ${recipe.steps[index]}`);
    }
  }

  nextStep() {
    const recipe = this.currentRecipe();
    if (recipe && this.currentStepIndex() < recipe.steps.length - 1) {
      this.currentStepIndex.update(v => v + 1);
      this.speakStep(this.currentStepIndex());
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(v => v - 1);
      this.speakStep(this.currentStepIndex());
    }
  }

  addToShoppingList(item: string) {
    this.shoppingList.update(list => {
      if (!list.includes(item)) return [...list, item];
      return list;
    });
  }

  removeFromShoppingList(item: string) {
    this.shoppingList.update(list => list.filter(i => i !== item));
  }

  setDiet(diet: string) {
    this.selectedDiet.set(diet);
  }

  goBack() {
    if (this.state() === 'cooking') this.state.set('recipes');
    else if (this.state() === 'recipes') this.state.set('home');
    else if (this.state() === 'shopping') this.state.set('recipes');
    else this.state.set('home');
    this.voiceService.cancel();
  }
}
