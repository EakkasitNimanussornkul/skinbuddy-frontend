<script setup lang="ts">
import LegalPage from '../components/Legal/LegalPage.vue'
import LegalPlaceholder from '../components/Legal/LegalPlaceholder.vue'

/**
 * The Terms of Service (/terms). Public and readable signed out. The
 * user-facing text of Part C of the owner's reviewed draft
 * (docs/legal-pages-draft.md), without its notes to the owner. Static: no
 * backend call besides the version line (components/Legal/LegalPage).
 */

const h2 = 'm-0 text-lg font-serif font-bold text-stone-800 dark:text-white'
const list = 'm-0 list-disc pl-5 space-y-1.5'
</script>

<template>
  <LegalPage title="Terms of Service">
    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">1. About SkinBuddy</h2>
      <p class="m-0">A final-year student project at Chiang Mai University, provided as it is for learning and personal use. It may change or stop at any time.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">2. Who can use it</h2>
      <p class="terms-age m-0">You must be 18 or older.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">3. Not medical advice</h2>
      <ul :class="list">
        <li>SkinBuddy helps you organise your skincare and learn about ingredients. It does not diagnose, treat or prescribe, and doesn't replace a dermatologist or doctor.</li>
        <li>The quiz skin type, % Match, weekly reports and SkinBuddy AI are guides made partly by an AI (Google Gemini), and they can be wrong.</li>
        <li>If you have a skin problem or a reaction, stop using the product and see a doctor.</li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">4. Your account</h2>
      <p class="terms-account m-0">You sign in with LINE. Your sign-in lasts 7 days. You can delete your account in Settings at any time.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">5. Product information</h2>
      <p class="m-0">It comes from public sources and from users, and may be incomplete or out of date. Read the product's own packaging. Prices are a guide.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">6. Products you send us</h2>
      <ul :class="list">
        <li>You confirm the information is true as far as you know, and that you may share the photo.</li>
        <li>Don't include other people's personal information.</li>
        <li>Our team may edit, add or not add a submission.</li>
        <li class="terms-catalogue">If it's added, you let us show its details and photo in the public catalogue, and they stay there if you later delete your account, without your name.</li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">7. Fair use</h2>
      <p class="m-0">Don't misuse SkinBuddy, try to get into other people's accounts, send harmful links or false information, or overload it. We limit uploads and pending submissions.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">8. Our responsibility</h2>
      <p class="m-0">SkinBuddy is a free student project. As far as the law allows, we aren't responsible for decisions you make based on it.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">9. Law</h2>
      <p class="m-0">The laws of Thailand.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">10. Contact</h2>
      <p class="m-0"><LegalPlaceholder /></p>
    </section>
  </LegalPage>
</template>
