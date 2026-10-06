<script setup lang="ts">
import LegalPage from '../components/Legal/LegalPage.vue'
import LegalPlaceholder from '../components/Legal/LegalPlaceholder.vue'
import ExternalLink from '../components/Shared/ExternalLink.vue'

/**
 * The Privacy Policy (/privacy). Public and readable signed out, as LINE's
 * User Data Policy 2.4 requires. The user-facing text of Part B of the
 * owner's reviewed draft (docs/legal-pages-draft.md), without its notes to
 * the owner, and corrected to the confirmed backend contract (2026-10-07):
 * only the weekly check-in needs the health consent, withdrawing it deletes
 * nothing, and deleting an account removes every product the user sent.
 * Static: no backend call besides the version line (components/Legal/LegalPage).
 */

const h2 = 'm-0 text-lg font-serif font-bold text-stone-800 dark:text-white'
const h3 = 'm-0 text-[15px] font-bold text-stone-800 dark:text-stone-100'
const list = 'm-0 list-disc pl-5 space-y-1.5'
const link = 'font-bold text-brand-primary-strong dark:text-brand-primary underline'
</script>

<template>
  <LegalPage title="Privacy Policy">
    <section class="flex flex-col gap-2.5">
      <p class="m-0">
        SkinBuddy is a final-year Software Engineering project at Chiang Mai University, made by <LegalPlaceholder />. It is a student project, not a commercial service. This policy explains what information SkinBuddy keeps, why, who else receives it and for how long, and what you can do about it. Anyone can read it, signed in or not. Questions: <LegalPlaceholder />.
      </p>
      <p class="privacy-age m-0 font-bold text-stone-800 dark:text-stone-100">You must be 18 or older to use SkinBuddy.</p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 :class="h2">What we keep, and why</h2>

      <h3 :class="h3">From LINE when you sign in</h3>
      <ul :class="list">
        <li>Your LINE user ID, display name and the link to your LINE profile picture. We use them to sign you in and show your name and picture.</li>
        <li>We copy them the first time you sign in, and keep them until you delete your account, which is longer than 24 hours.</li>
        <li>We don't receive your email address or phone number, and we don't keep the LINE sign-in token.</li>
      </ul>

      <h3 :class="h3">Your skin type and quiz</h3>
      <p class="m-0">Your four-letter skin type, and the scores from each quiz you complete (not your individual answers). Used to show your type and work out % Match.</p>

      <h3 :class="h3">Your shelf</h3>
      <p class="m-0">The products you add, when you opened them, when they expire, how you're using them, and any notes you write when you put one away.</p>

      <h3 :class="h3">Your routine</h3>
      <p class="m-0">Your steps, their schedule, and a day-by-day record of the steps you've ticked off. Old routines are kept as an archive.</p>

      <h3 :class="h3">Your weekly skin check-in</h3>
      <p class="m-0">Only if you agree on the consent screen first.</p>
      <ul :class="list">
        <li>The symptoms you pick, how bad they are, where they are on your skin, your notes, and the weekly report made from them.</li>
        <li>We treat this as health information, which Thai law (the PDPA) says needs your explicit consent.</li>
        <li class="privacy-withdraw">You can withdraw that consent in Settings at any time. You then can't add new check-ins. Withdrawing deletes nothing: the check-ins you already sent stay until you delete your account.</li>
      </ul>

      <h3 :class="h3">Products you send us</h3>
      <ul :class="list">
        <li>Everything in the "Submit a product" form, including the photo and your note to the reviewer.</li>
        <li>Our team sees your LINE display name next to it.</li>
        <li>If it's added, its product details become part of the public catalogue.</li>
        <li>Photos are stored in public storage when you upload them, after we remove hidden data such as location and camera details.</li>
        <li>Photos that are not added, replaced or never used are deleted.</li>
      </ul>

      <h3 :class="h3">SkinBuddy AI chat</h3>
      <p class="m-0">Not stored on our server. Your browser keeps the conversation until you close the tab.</p>

      <h3 :class="h3">In your browser</h3>
      <p class="m-0">Your sign-in (valid for 7 days), a copy of your basic profile, your quiz progress and your light or dark mode choice. No advertising or analytics trackers.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Is any of it required?</h2>
      <ul :class="list">
        <li><strong>Required:</strong> your LINE details, to have an account.</li>
        <li><strong>Optional:</strong> everything else, including the weekly check-in. Each feature only works with the information it needs.</li>
      </ul>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Legal bases</h2>
      <ul :class="list">
        <li>Your explicit consent for the weekly check-in.</li>
        <li>Your agreement to these terms when you sign in, for running your account and its features.</li>
      </ul>
    </section>

    <section class="privacy-recipients flex flex-col gap-2.5">
      <h2 :class="h2">Who else receives it</h2>
      <ul :class="list">
        <li><strong>LINE (LY Corporation):</strong> signs you in. It also sends SkinBuddy reminders to your LINE: a routine reminder that names the products you haven't ticked off yet, and a weekly check-in reminder. These go to every signed-in user, and there is no setting in the app to turn them off.</li>
        <li class="privacy-supabase"><strong>Supabase:</strong> hosts our database and photo storage, in South Korea.</li>
        <li>
          <strong>Google (Gemini AI):</strong> powers SkinBuddy AI, the weekly report and routine suggestions. We never send your name, LINE ID or account ID. We send:
          <ul class="m-0 mt-1.5 list-[circle] pl-5 space-y-1.5">
            <li><strong>Chat:</strong> your message, the conversation so far, your skin type and your shelf product names.</li>
            <li><strong>Weekly report:</strong> your skin type; this week's symptoms, severity, affected areas and notes; up to four earlier weeks' symptoms and notes; and your routine products.</li>
            <li><strong>Routine suggestions:</strong> your skin type, your answers to the routine questions, and which catalogue products you own.</li>
          </ul>
        </li>
      </ul>
      <p class="privacy-consent-scope m-0">Only the weekly check-in asks for your separate consent first. Chat and routine suggestions send what is listed above whenever you use them.</p>
      <p class="m-0">We use Google's free Gemini service. On it:</p>
      <ul :class="['privacy-gemini', list]">
        <li>Google may use what we send, and its answers, to improve its products;</li>
        <li>people at Google may read them, after Google separates them from our account;</li>
        <li>Google keeps them for 55 days to check for misuse;</li>
        <li>Google may store them in any country where it has facilities.</li>
      </ul>
      <p class="privacy-gemini-sources m-0">
        From Google's
        <ExternalLink url="https://ai.google.dev/gemini-api/terms" kind="curated" :class="link">Gemini API Additional Terms</ExternalLink>
        and the
        <ExternalLink url="https://ai.google.dev/gemini-api/docs/usage-policies" kind="curated" :class="link">Gemini API usage policies</ExternalLink>.
        How long Google keeps content it uses to improve its products isn't stated in those terms.
      </p>
      <p class="m-0">We don't sell your information or share it for advertising.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Information sent outside Thailand</h2>
      <p class="m-0">Supabase (South Korea), Google and LINE may store or process your information outside Thailand.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">How long we keep it</h2>
      <ul :class="list">
        <li>Until you delete your account. Nothing else is deleted automatically, except product photos that aren't needed (see above).</li>
        <li>You can delete shelf items and routine steps yourself at any time.</li>
        <li>Copies Google keeps follow Google's terms (above).</li>
      </ul>
    </section>

    <section class="privacy-deletion flex flex-col gap-2.5">
      <h2 :class="h2">Deleting your account</h2>
      <p class="m-0">Settings › Delete my account removes:</p>
      <ul :class="list">
        <li>your LINE details, skin type and quiz results;</li>
        <li>your shelf, routines and routine history;</li>
        <li>your weekly check-ins and reports;</li>
        <li>every product you sent, whether it was waiting for review, not added or added, and its photo unless a product in the catalogue shows it.</li>
      </ul>
      <p class="m-0">Before deleting, LINE asks you to confirm it's you. LY Corporation is then told, and the link between SkinBuddy and your LINE account ends. Products already added to the catalogue stay, with no name or note from you. This can't be undone. If SkinBuddy can't end the LINE link itself, we'll tell you to remove it in LINE (Settings › Account › Authorized apps); your data is still deleted.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Your rights</h2>
      <p class="m-0">Under the PDPA you can:</p>
      <!-- s.19 and s.73 are cited one by one. The six rights between them are
           cited as the group the sources give (ss.30-34 and 36), since which
           section holds which right has not been confirmed. -->
      <ul :class="['privacy-rights-withdraw', list]">
        <li>withdraw consent (s.19);</li>
      </ul>
      <div class="privacy-rights-group flex flex-col gap-1.5">
        <ul :class="list">
          <li>get a copy of your information, and have it sent to another service;</li>
          <li>object to its use;</li>
          <li>have it deleted;</li>
          <li>restrict its use;</li>
          <li>have it corrected;</li>
        </ul>
        <p class="privacy-rights-sections m-0 pl-5 text-sm text-stone-600 dark:text-stone-300">(PDPA sections 30–34 and 36)</p>
      </div>
      <ul :class="['privacy-rights-complaint', list]">
        <li>complain to the Personal Data Protection Committee (s.73).</li>
      </ul>
      <p class="m-0">Email <LegalPlaceholder />. You can delete your account and withdraw check-in consent yourself in Settings.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Security</h2>
      <p class="m-0">Your sign-in lasts 7 days and is kept in your browser, so sign out on a shared device. Our server checks every request belongs to your account.</p>
    </section>

    <section class="flex flex-col gap-2.5">
      <h2 :class="h2">Changes</h2>
      <p class="m-0">When this policy changes, the version and date above change. If the change needs your consent again, we'll ask you.</p>
    </section>
  </LegalPage>
</template>
