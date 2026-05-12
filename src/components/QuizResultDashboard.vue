<script setup lang="ts">
defineProps<{
  skinType: string
  scores: {
    hydration: number
    sensitivity: number
    pigmentation: number
    aging: number
  }
}>()
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

    <div class="flex flex-col gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 class="text-4xl font-serif text-center mb-6 text-slate-800">{{ skinType }}</h2>

        <div class="space-y-5">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3 text-blue-600">💧</div>
            <div class="flex-grow">
              <div class="flex justify-between text-sm font-semibold mb-1">
                <span>{{ scores.hydration >= 10 ? 'Oily' : 'Dry' }}</span>
                <span class="text-slate-500">{{ scores.hydration }}/16</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-400" :style="{ width: (scores.hydration / 16) * 100 + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mr-3 text-teal-600">🌿</div>
            <div class="flex-grow">
              <div class="flex justify-between text-sm font-semibold mb-1">
                <span>{{ scores.sensitivity >= 10 ? 'Sensitive' : 'Resistant' }}</span>
                <span class="text-slate-500">{{ scores.sensitivity }}/16</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-teal-400" :style="{ width: (scores.sensitivity / 16) * 100 + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mr-3 text-orange-600">☀️</div>
            <div class="flex-grow">
              <div class="flex justify-between text-sm font-semibold mb-1">
                <span>{{ scores.pigmentation >= 10 ? 'Pigmented' : 'Non-Pigmented' }}</span>
                <span class="text-slate-500">{{ scores.pigmentation }}/16</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-orange-400" :style="{ width: (scores.pigmentation / 16) * 100 + '%' }"></div>
              </div>
            </div>
          </div>

          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3 text-purple-600">⏳</div>
            <div class="flex-grow">
              <div class="flex justify-between text-sm font-semibold mb-1">
                <span>{{ scores.aging >= 10 ? 'Wrinkle-Prone' : 'Tight' }}</span>
                <span class="text-slate-500">{{ scores.aging }}/16</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-purple-400" :style="{ width: (scores.aging / 16) * 100 + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-grow">
        <h3 class="text-xl font-serif mb-4 text-center">Skin Profile Details</h3>
        <p class="text-sm text-slate-600 leading-relaxed mb-3">
          <strong class="text-slate-900">Hydration:</strong> Your skin barrier indicates a tendency toward {{ scores.hydration >= 10 ? 'excess sebum production' : 'moisture loss and flakiness' }}.
        </p>
        <p class="text-sm text-slate-600 leading-relaxed mb-3">
          <strong class="text-slate-900">Sensitivity:</strong> You have a {{ scores.sensitivity >= 10 ? 'highly reactive' : 'robust' }} baseline, meaning active ingredients should be {{ scores.sensitivity >= 10 ? 'introduced slowly' : 'tolerated well' }}.
        </p>
      </div>
    </div>

    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
      <h3 class="text-xl font-serif mb-6 text-center border-b border-slate-100 pb-4">Key Characteristics</h3>
      <div class="flex-grow space-y-6">
        <div class="flex items-start">
          <div class="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">🛡️</div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Barrier Integrity</h4>
            <p class="text-xs text-slate-500">Focus on strengthening the stratum corneum before introducing strong exfoliants.</p>
          </div>
        </div>
        <div class="flex items-start">
          <div class="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">✨</div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Melanin Reactivity</h4>
            <p class="text-xs text-slate-500">Prone to post-inflammatory hyperpigmentation after breakouts or sun exposure.</p>
          </div>
        </div>
        <div class="flex items-start">
          <div class="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">💧</div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Moisture Retention</h4>
            <p class="text-xs text-slate-500">Requires humectants that bind water to the skin without clogging pores.</p>
          </div>
        </div>
        <div class="flex items-start">
          <div class="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl flex-shrink-0 mr-4">🧬</div>
          <div>
            <h4 class="font-semibold text-sm mb-1">Collagen Support</h4>
            <p class="text-xs text-slate-500">Needs proactive collagen synthesis support to maintain long-term elasticity.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h3 class="font-serif text-center border-b border-slate-100 pb-2 mb-4">Morning ☀️</h3>
            <ul class="space-y-3 text-xs text-slate-600">
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Gentle Cleanser</li>
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Antioxidant Serum</li>
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Light Moisturizer</li>
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> SPF 50+</li>
            </ul>
          </div>
          <div>
            <h3 class="font-serif text-center border-b border-slate-100 pb-2 mb-4">Evening 🌙</h3>
            <ul class="space-y-3 text-xs text-slate-600">
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Double Cleanse</li>
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Treatment Serum</li>
              <li class="flex items-center"><span class="w-4 h-4 bg-slate-100 rounded-full mr-2"></span> Barrier Cream</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-grow">
        <h3 class="text-lg font-serif mb-4 text-center border-b border-slate-100 pb-2">Top Ingredients</h3>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="flex flex-col items-center">
            <div class="text-3xl mb-2">🌿</div>
            <span class="text-xs font-semibold">Centella</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-3xl mb-2">💎</div>
            <span class="text-xs font-semibold">Niacinamide</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-3xl mb-2">🧪</div>
            <span class="text-xs font-semibold">Ceramides</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
