<script setup lang="ts">
import { inject, ref } from 'vue'
import { readApiProblem } from '../../api/apiProblem'
import { uploadSubmissionImage, ACCEPTED_IMAGE_TYPES } from '../../api/submissionsApi'
import { DRAFT_CONTEXT, checkPhotoFile } from './submissionDraft'
import ChoiceChip from './ChoiceChip.vue'
import FieldError from './FieldError.vue'

// Step 1: name, brand, category, and an optional photo of the front.
defineProps<{
  categories: string[]
  categoriesState: 'loading' | 'ready' | 'failed'
}>()
const emit = defineEmits<{ retryCategories: [] }>()
const uploading = defineModel<boolean>('uploading', { default: false })

const { draft, errors } = inject(DRAFT_CONTEXT)!

const fileInput = ref<HTMLInputElement | null>(null)
const photoError = ref('')

/** The server's answer to a refused upload, in plain words. */
const uploadFailure = (error: unknown): string => {
  const { status } = readApiProblem(error)
  if (status === 413) return 'That photo is over 5 MB. Choose a smaller one.'
  if (status === 415) return "That file isn't a JPG, PNG or WebP image. Choose a photo in one of those."
  if (status === 401) return 'Your sign-in has expired. Sign in again, then add the photo.'
  if (status === 422) return 'The photo did not arrive. Choose it again.'
  if (status === null) return "We couldn't upload the photo. Check your connection and try again."
  return "We couldn't upload the photo. Try again, or carry on without one."
}

const onPick = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Cleared so choosing the same file again still fires a change.
  input.value = ''
  if (!file) return

  photoError.value = ''
  const problem = checkPhotoFile(file)
  if (problem) {
    photoError.value = problem
    return
  }

  uploading.value = true
  try {
    const uploaded = await uploadSubmissionImage(file)
    draft.photo = { imagePath: uploaded.image_path, previewUrl: uploaded.public_url, fileName: file.name }
    delete errors.photo
  } catch (error: unknown) {
    photoError.value = uploadFailure(error)
  } finally {
    uploading.value = false
  }
}

const removePhoto = () => {
  draft.photo = null
  photoError.value = ''
}

const toggleCategory = (category: string) => {
  draft.category = draft.category === category ? '' : category
  delete errors.category
}

const described = (field: string) => (errors[field] ? `${field}-err` : undefined)
const clear = (field: string) => {
  delete errors[field]
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-col gap-1.5 mt-5 lg:mt-6">
      <label for="sub-name" class="text-sm font-bold text-stone-800 dark:text-white">Product name *</label>
      <input
        id="sub-name"
        v-model="draft.name"
        type="text"
        autocomplete="off"
        :maxlength="260"
        :aria-invalid="errors.name ? 'true' : undefined"
        :aria-describedby="described('name')"
        :class="[
          'h-12 px-3.5 rounded-[14px] bg-brand-surface-light dark:bg-stone-800 text-[15px] text-stone-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
          errors.name ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
        ]"
        @input="clear('name')"
      />
      <FieldError id="name-err" :message="errors.name" />
    </div>

    <div class="flex flex-col gap-1.5 mt-4">
      <label for="sub-brand" class="text-sm font-bold text-stone-800 dark:text-white">Brand *</label>
      <input
        id="sub-brand"
        v-model="draft.brand"
        type="text"
        autocomplete="off"
        placeholder="e.g. CeraVe"
        :maxlength="260"
        :aria-invalid="errors.brand ? 'true' : undefined"
        :aria-describedby="described('brand')"
        :class="[
          'h-12 px-3.5 rounded-[14px] bg-brand-surface-light dark:bg-stone-800 text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50',
          errors.brand ? 'border-2 border-red-800 dark:border-red-300' : 'border-[1.5px] border-brand-surface-border dark:border-stone-600',
        ]"
        @input="clear('brand')"
      />
      <FieldError id="brand-err" :message="errors.brand" />
    </div>

    <fieldset id="sub-category" class="mt-4 flex flex-col gap-2 border-0 p-0 m-0" :aria-describedby="described('category')" tabindex="-1">
      <legend class="p-0 text-sm font-bold text-stone-800 dark:text-white">Category *</legend>
      <div v-if="categoriesState === 'loading'" class="flex flex-wrap gap-2 mt-2" aria-hidden="true">
        <span v-for="n in 6" :key="n" class="h-11 w-24 rounded-full bg-brand-surface-border/60 dark:bg-stone-700 animate-pulse motion-reduce:animate-none" />
      </div>
      <div v-else-if="categoriesState === 'failed'" class="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-300">
        <span>We couldn't load the categories.</span>
        <button
          type="button"
          class="min-h-11 px-4 rounded-xl border-[1.5px] border-brand-primary-strong dark:border-brand-primary text-brand-primary-strong-hover dark:text-brand-primary-accent font-bold"
          @click="emit('retryCategories')"
        >
          Try again
        </button>
      </div>
      <div v-else class="flex flex-wrap gap-2 mt-2">
        <ChoiceChip
          v-for="category in categories"
          :key="category"
          :label="category"
          :pressed="draft.category === category"
          @toggle="toggleCategory(category)"
        />
      </div>
      <FieldError id="category-err" :message="errors.category" />
    </fieldset>

    <div class="flex flex-col gap-1.5 mt-[18px]">
      <span id="photo-label" class="text-sm font-bold text-stone-800 dark:text-white">
        Photo <span class="font-medium text-stone-500 dark:text-stone-400">(optional)</span>
      </span>
      <input
        ref="fileInput"
        type="file"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        :accept="ACCEPTED_IMAGE_TYPES.join(',')"
        @change="onPick"
      />

      <div
        v-if="draft.photo"
        class="photo-preview flex items-center gap-3.5 p-3 rounded-2xl border border-brand-surface-border dark:border-stone-600 bg-brand-surface-light dark:bg-brand-surface-dark"
      >
        <img
          v-if="draft.photo.previewUrl"
          :src="draft.photo.previewUrl"
          alt="The photo you added"
          class="w-20 h-20 rounded-xl object-cover bg-brand-bg-light dark:bg-stone-800"
        />
        <span class="flex-1 min-w-0 flex flex-col gap-0.5">
          <span class="text-sm font-bold text-stone-800 dark:text-white truncate">{{ draft.photo.fileName }}</span>
          <span class="text-xs text-stone-500 dark:text-stone-400">Added</span>
        </span>
        <button
          type="button"
          class="min-h-11 px-3 rounded-xl text-sm font-bold text-stone-600 dark:text-stone-300 hover:text-red-800 dark:hover:text-red-300"
          @click="removePhoto"
        >
          Remove
        </button>
      </div>

      <button
        v-else
        type="button"
        class="photo-pick min-h-28 rounded-2xl border-[1.5px] border-dashed border-stone-300 dark:border-stone-500 bg-brand-surface-light dark:bg-brand-surface-dark flex flex-col items-center justify-center gap-1.5 text-brand-text dark:text-stone-200 hover:border-brand-primary-strong dark:hover:border-brand-primary transition-colors disabled:opacity-60"
        :disabled="uploading"
        aria-describedby="photo-label photo-hint"
        @click="fileInput?.click()"
      >
        <svg class="w-[26px] h-[26px] text-brand-primary-strong dark:text-brand-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
        <span class="text-sm font-bold">{{ uploading ? 'Uploading the photo...' : 'Add a photo of the front' }}</span>
        <span id="photo-hint" class="text-xs text-stone-500 dark:text-stone-400">JPG, PNG or WebP, up to 5 MB</span>
      </button>
      <FieldError id="photo-err" :message="photoError || errors.photo" />
    </div>
  </div>
</template>
