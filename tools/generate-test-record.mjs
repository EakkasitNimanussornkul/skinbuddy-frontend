#!/usr/bin/env node
/**
 * Generates Unit Test Record entries from real Vitest results.
 *
 * Usage:
 *   npm run test:record
 *
 * Runs the suite with Vitest's JSON reporter and converts the result into the
 * seven-field card format used by SkinBuddy_Test_Record. Every card reflects a
 * test that actually executed - nothing here is hand-written, so the document
 * cannot drift from the suite.
 *
 * Two fields cannot come from the runner:
 *   - Module / Feature / Prerequisite: taken from SPEC_MAP below, an explicit
 *     table keyed by spec file. Same approach as the backend's
 *     tools/generate_test_record.py.
 *   - Method Under Test: taken from the second-level describe() block, which is
 *     authored deliberately for this purpose (see the spec files).
 *
 * IDs use the placeholder prefix UTC-FE- because the existing document runs
 * UTC-01..35 and the backend generator emits from UTC-36. The project owner
 * intends to renumber by hand, so this must not claim numbers unilaterally.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Forward slashes deliberately: Vitest's --outputFile does not accept a
// backslash-separated Windows path and silently writes nothing.
const RAW_RESULT = join(ROOT, 'node_modules', '.tmp-test-record.json').split('\\').join('/')
const OUT_FILE = join(ROOT, 'docs', 'FRONTEND_TEST_RECORD.md')

const ID_PREFIX = 'UTC-FE'

/**
 * Explicit spec-file -> unit mapping. Order here is the order of the document.
 * `note` is emitted as a caveat under the group header when present.
 */
const SPEC_MAP = [
  {
    file: 'src/__tests__/stores/quizStore.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'stores/quizStore',
    prerequisite: 'Fresh Pinia instance per test. No mocks required - the store is pure client-side state.',
  },
  {
    file: 'src/__tests__/api/quizapi.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'api/quizapi',
    prerequisite: 'Shared axios client (src/api/index.ts) replaced with a mock. No network access.',
  },
  {
    file: 'src/__tests__/views/SkinQuizView.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinQuizView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage per case (src/__tests__/fixtures/quizView.ts). saveSkinType and updateUserSkinType are mocked; the quiz store, auth store and toast composable are all real. Vitest fake timers drive the 1400ms calculating beat that gates the results panel. No network access.',
    note: 'Every answer scores 1, so finalSkinType resolves deterministically to DRNT and the saved payload can be asserted exactly: each part averages 1 from 4 counted answers, with version 2. The quiz cannot be seeded as already finished instead: onMounted starts a finished quiz over, so a pre-finished fixture is wiped before the first assertion - the cases answer every question through the child component. The LIFF card is the only place in the codebase that exercises window.liff.',
  },
  {
    file: 'src/__tests__/components/ExpressSkinSelectorModal.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'components/Quiz/ExpressSkinSelectorModal',
    prerequisite:
      'The component mounted with @vue/test-utils, isOpen: true, and its <Teleport to="body"> stubbed so the markup stays inside the wrapper. The sixteen Baumann types come from src/data/skinprofiles.ts as shipped - no fixture. No network access.',
    note: 'filteredTypes is a computed inside <script setup> and is not importable, so it is exercised through the dropdown it feeds: each card asserts the type codes actually listed under the input. That makes these cards evidence about the rendered control, not only about the filter - including that an unmatched query renders no dropdown at all rather than an empty one.',
  },
  {
    file: 'src/__tests__/views/SkinTypeLanding.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinTypeLanding',
    prerequisite:
      'The view mounted with @vue/test-utils on a real vue-router memory history, so route.query.redirect is read from an actual route rather than a stub. Fresh Pinia and cleared localStorage per case. src/api/authApi.ts replaced with a mock; router.push spied with its real implementation left in place. The useToast composable is the real one, read back and emptied between cases. No network access.',
    note: 'The redirect parameter is the subject of most of these cards. A user sent to this screen by the router guard has the page they asked for carried in route.query.redirect, and both units must hand it back - goToQuiz through to the quiz, handleExpressConfirm through to the destination itself. The two failure cards also pin that a rejected save leaves the local session unchanged: recording a skin type the backend refused to store would leave the app showing a profile the API disagrees with.',
  },
  {
    file: 'src/__tests__/views/SkinProfileView.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinProfileView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, its <Teleport> stubbed. The skin type under test is written into the real auth store with setAuth, because the view reads authStore.user.skin_type and so depends on the shape setAuth produces. searchProducts is mocked; pickTopRecommendations is deliberately left real, so the recommendation cards show the view actually narrowing a response. The skinProfiles and typologyDetails dictionaries are used as shipped - no fixture. No network access.',
    note: 'All four units are read through what the page renders: the report body for profileData, the four trait cards for axes, the comparison sheet\'s props for openTypologyModal, and the recommendations widget\'s props for loadRecommendations. Two pairs are deliberate rather than redundant - profileData is asserted for two different valid codes, because a view that always showed one fixed profile would satisfy a single-type assertion on its own; and axes is asserted for OSPW and DRNT, which are complements, so both branches of the opposite-letter choice are taken on all four. With the profile redesign (feat/19-quiz-redesign) a stored code that is not one of the sixteen no longer falls back to OSPW\'s profile, which handed the user another type\'s routine and avoid-list as their own; it gets the empty state instead. Three cards were rewritten in place for that, keeping their IDs: UTC-FE-12-TC-03 and TC-04 (the empty states for an unreadable code and for no code) and UTC-FE-14-TC-04 (no trait to open for an unreadable code). The rest of the redesign is covered in views/SkinProfilePage.spec.ts at the end of this record.',
  },
  {
    file: 'src/__tests__/components/TypologyComparisonModal.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'components/Quiz/TypologyComparisonModal',
    prerequisite:
      'The component mounted with @vue/test-utils with real records from src/data/typologydata.ts - no fixture - and its <Teleport> and the nested ImageZoomModal stubbed. No network access.',
    note: 'The only prior coverage of this component was in SkinProfileView.spec.ts, which asserts the props are handed over correctly but stubs Teleport, so this template never rendered there and nothing showed what the user is actually shown. These cards render it. The characteristic lists are asserted against the dictionary rather than against the number three: every trait currently records three points, and a card hardcoding that would start hiding the fourth the day one is added.',
  },
  {
    file: 'src/__tests__/components/ImageZoomModal.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'components/Shared/ImageZoomModal',
    prerequisite:
      'The component mounted with @vue/test-utils, with <Transition> deliberately left unstubbed. Wheel and pointer events are dispatched against the interactive frame and the result read off the zoom indicator and the image transform. No network access.',
    note: 'Unstubbing <Transition> is load-bearing rather than tidiness. Vue Test Utils stubs it by default and resetZoom is wired to its @enter hook, so under the default stub that hook never fires and the reopen cards would be asserting a reset the test itself had disabled - checked by running them both ways. Also worth recording for a reader: the clamp lands on exactly 1, not near it, which is what lets the identity comparisons in handleWheel and onDrag be written as === 1 without a floating-point tolerance.',
  },
  {
    file: 'src/__tests__/stores/shelfStore.spec.ts',
    feature: '#3 Skincare storage',
    module: 'stores/shelfStore',
    prerequisite:
      'Fresh Pinia instance per test. src/api/shelfapi.ts replaced with a mock. No network access. The in-flight loading case holds getMyShelf open on a promise the test resolves by hand, so the pending state is asserted while the request is genuinely unsettled rather than inferred from the value either side of it.',
    note: 'useShelfStore() is not called anywhere in src/ - ShelfView.vue imports only the ShelfItem type from this module and calls getMyShelf() directly into a local ref. These cards therefore document the store module in isolation, not the shelf screen: they are not evidence that loading, adding or removing a shelf item works for a user. The path the application actually takes is covered by the api/shelfapi cards below. The store is correct and its types are used; it simply has no caller.',
  },
  {
    file: 'src/__tests__/views/ShelfView.spec.ts',
    feature: '#3 Skincare storage',
    module: 'views/ShelfView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, its <Teleport> stubbed. getMyShelf and removeFromShelf are mocked; resolveShelfItemStatus and resolveCatalogState are deliberately left real, because the filtering and the four-state resolution are the rules under test. ShelfCard is replaced with a stub that renders its item id, which is what makes filteredProducts readable; the modals and the quick-add banner are stubbed so their own requests stay out of these assertions. No network access.',
    note: 'filteredProducts is read as the list of ids the grid renders, and shelfState as which of the four panels is on screen. One caution about the failure cards: the grid is not rendered at all in the failed state, so asserting it is empty says nothing about whether the underlying list was cleared. The card that pins the clearing reads it off the quick-add banner\'s item-count instead, which renders in every state - the grid assertion passed with the clearing removed, and was rewritten after a mutation run caught it.',
  },
  {
    file: 'src/__tests__/components/ProductLifecycleController.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ProductLifecycleController',
    prerequisite:
      'The component mounted with @vue/test-utils. Only markItemOpened is mocked; paoPeriodHasElapsed and the api/dates helpers stay real, because the expiry arithmetic is what these cards check. Expected dates are computed with those same helpers rather than written as fixed strings, so the cards hold in any timezone the project is marked in. No network access.',
    note: 'The edit cards use an item opened today on purpose. A period is counted from the item\'s OPENED date, and for an item opened today that coincides with today - which is the point: a fixture opened earlier would not distinguish a correct implementation from one counting from today, and ProductConfigurator legitimately counts from today in its own context, where there is no opened date yet. The FE-DEF-19 cards cover the disabling itself - which periods render disabled, the explanatory note appearing only when some have, and a period ending exactly today still being offered, which is the boundary the calendar\'s min-date agrees on. One limitation, stated rather than implied: setEditPAO repeats the periodHasElapsed check internally, and that repeat is NOT covered. jsdom does not dispatch clicks on disabled controls, so a case clicking a disabled period would pass with the internal guard removed - it would be testing the disabled attribute while appearing to test the guard. Verified by removing the guard and watching such a case still pass, which is why it was not written. Both success toasts are now pinned by sentence and not only by type - "Product opened! Clock started." and "Expiration date & PAO updated!" - which the two failure sentences already were. The pair has to stay distinct, because reporting a started clock when the user only edited an expiry date would misdescribe what they did, and UC-08 and STC-08 quote the first verbatim. The opening toast is asserted once rather than in both PAO branches: it is raised on a single line after the branch, so a second case would be two tests of one statement.',
  },
  {
    file: 'src/__tests__/components/ArchiveLogForm.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ArchiveLogForm',
    prerequisite:
      'The component mounted with @vue/test-utils, updateShelfStatus mocked. Outcomes are selected by clicking the labelled buttons rather than by setting state, so the label-to-stored-value mapping is exercised rather than assumed. No network access.',
    note: 'The mapping is the subject: the three buttons read Finished, Abandoned and Expired, and store empty, discarded and expired. Only one pair differs in wording, and nothing else in the codebase states that "Abandoned" and discarded are the same thing.',
  },
  {
    file: 'src/__tests__/components/ItemDetailsModal.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ItemDetailsModal',
    prerequisite:
      'The component mounted with @vue/test-utils against a fully populated catalogue join, with its children rendered rather than stubbed so the safety panel, the actives grid and the lifecycle controller are the real ones. removeFromShelf is mocked; analyzeProduct is mocked per card to produce each of the four safety statuses, with resolveSafety and evaluateSafety left real. The lifespan cards fake only Date (vi.useFakeTimers({ toFake: [\'Date\'] })) and the closing card fakes only setTimeout, so the rest of the scheduler stays real and flushPromises still resolves. The delete is reached by walking the two-step confirmation the way a user does. No network access.',
    note: 'The property these cards certify is that the safety panel is advisory: in each of the warned, unavailable and unassessed states they assert that the archive and delete controls are present and enabled and that the description, actives and lifecycle controller still render. This modal never imports blocksAction, unlike the two screens that gate a write on it, because the user is looking at a product they already own - so the panel reports and nothing else responds. The five render states are distinguished by their own wording, including unassessed against unavailable (FE-DEF-29) and the cleared panel that FE-DEF-36 added. usageLifespan is covered across all four of its branches, including the archive freeze, which a running count would inflate every day the log was reopened. The toast wording is asserted verbatim rather than merely present: ShelfView\'s own delete path emits the identical sentence, and UC-07 and UC-35 quote it, so a drift between the two paths becomes a contradiction in the SRS (FE-DEF-17). One assertion here was vacuous when first written and is worth recording as a pattern: the category was read out of the whole rendered text as "Cleanser", which is also a word in the product name, so it held with the category binding replaced by its fallback. It now reads the badge element. The handleChildUpdate cards are the parent half of STC-08: the write, the date arithmetic and the emit-on-success are covered at the ProductLifecycleController level, and what is only observable here is that the parent merges the emitted row into its own copy, so the lifespan and PAO tiles move before any refetch lands and the prop the parent owns is left untouched. Two of that method\'s branches are deliberately uncovered, and neither has a caller: the optional payload (`updated` is the only binding and always carries one) and the merge being a merge rather than an assignment (the single emitter sends a full clone, so the spread and a plain assignment cannot be told apart from outside). Asserting either would describe a contract nothing exercises.',
  },
  {
    file: 'src/__tests__/components/AddProductModal.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/AddProductModal',
    prerequisite:
      'The component mounted with @vue/test-utils, its <Teleport> and three child components stubbed. searchProducts, analyzeProduct and addToShelf are mocked; resolveSafety and blocksAction are left real, so the gate these cards describe is the gate the application uses. Product selection and the save are driven through the children\'s own emits. No network access.',
    note: 'The four outcomes of the compatibility check are distinguished here: cleared saves, unavailable refuses, unassessed refuses with its own wording, and warnings open the confirmation dialogue instead of blocking. The unavailable card is the important one - the catch used to only log, so control fell through to addToShelf and the product was committed unchecked while the user was told it succeeded.',
  },
  {
    file: 'src/__tests__/components/SafetyWarningModal.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/SafetyWarningModal',
    prerequisite:
      'The component mounted with @vue/test-utils and a warnings array passed directly - no store, no router, no network. resolveSeverityBand is the real shared reading, so the badge cards exercise the same banding the shelf and compare screens use.',
    note: 'Both hosts previously hid this component from its own tests: AddProductModal stubs it outright and ProductHeroSection only inspects its props, so nothing rendered this template. One limitation is stated rather than implied - the Read more toggle is gated on the measurement useClampedText performs, and jsdom performs no layout, so scrollHeight and clientHeight both read 0 and nothing registers as overflowing. A card pins that the control is absent under those conditions rather than pretending to test the expansion; the toggle itself needs a real browser, which is how FE-DEF-26 and FE-DEF-27 were verified.',
  },
  {
    file: 'src/__tests__/components/ProductHeroSection.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Catalog/ProductHeroSection',
    prerequisite:
      'The component mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia, cleared localStorage and the nested SafetyCheckModal and <Teleport> stubbed. analyzeProduct and addToShelf are mocked; resolveSafety and showsDuplicates are left real, so the gate is the one the application uses. The add is driven through the primary control rather than by calling the handler. No network access.',
    note: 'Mirrors the four safety outcomes covered for AddProductModal, and records the one real difference between the two screens. The flows are ordered oppositely: AddProductModal collects the configuration first and checks on save, so its override has a pendingPayload to commit in one step. Here the check runs first and the configurator opens only on a pass, so at override time the user has chosen no period, opened state or date - the override therefore opens the configurator rather than saving, and a card pins that it does. Committing directly would store defaults nobody picked.',
  },
  {
    file: 'src/__tests__/api/shelfapi.spec.ts',
    feature: '#3 Skincare storage',
    module: 'api/shelfapi',
    prerequisite: 'Shared axios client (src/api/index.ts) replaced with a mock. The date-derivation cards call pure functions directly with plain objects and an explicit clock, so they do not depend on the day the suite is run. No network access.',
    note: 'The four date-derivation groups here are shared rules rather than request wrappers, and each was extracted because two places disagreed. resolveExpiryDate, daysUntilExpiry and resolveShelfItemStatus pin FE-DEF-16, where a shelf card read "Expired" while the Expired filter did not list the same item. paoPeriodHasElapsed pins FE-DEF-19, where the expiry edit panel\'s calendar refused a past date and the period buttons beside it wrote one anyway.',
  },
  {
    file: 'src/__tests__/api/dates.spec.ts',
    feature: '#3 Skincare storage',
    module: 'api/dates',
    prerequisite:
      "Pure functions called directly with Date objects and date strings. Vitest fake timers pin the clock where 'today' is asserted. No component mounting and no network access.",
    note: "Pins FE-DEF-21: every opened date, expiration date and picker floor in the shelf was computed with new Date().toISOString().split('T')[0], which reads the calendar day in UTC and so returns yesterday for the whole local morning in UTC+7. The assertions are written against the machine's own local calendar rather than fixed strings, so they hold in any zone the project is marked in.",
  },
  {
    file: 'src/__tests__/composables/useClampedText.spec.ts',
    feature: '#3 Skincare storage',
    module: 'composables/useClampedText',
    prerequisite:
      'The overflow comparison called directly with two heights. No component mounting, no DOM measurement and no network access.',
    note: 'Pins FE-DEF-26 and FE-DEF-27: two components decided whether to offer a "Read more" control without measuring anything - one always offered it, the other offered it only for messages over 90 characters, which hid the control on safety warnings that really were cut off. Only the comparison is covered, so these cards are not evidence that the control appears and disappears correctly on screen; that was verified in the browser. Earlier revisions of this note said the project had no layer for mounting components. That is no longer true - the two Feature #2 component groups above mount their subjects - but it does not help here: the measurement feeds exceedsClamp with el.scrollHeight and el.clientHeight, and jsdom reports both as 0 because it performs no layout. Every paragraph would test as non-overflowing regardless of its text. Covering that needs a real browser, not a mount.',
  },
  {
    file: 'src/__tests__/components/CustomDatePicker.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shared/CustomDatePicker',
    prerequisite:
      'The component mounted with @vue/test-utils and opened by clicking its input, the way a user opens it. No clock is faked: every date is passed in as a string, so the grid is deterministic. Day buttons are found by number, which is safe for any day up to 22 because the grid pads its front with the tail of the previous month and does not pad its back. No network access.',
    note: 'Two limitations, both stated rather than implied. First, these cards do NOT pin FE-DEF-22, although the opening card looks as though it should: the bug read the stored string with new Date(), which is UTC midnight and lands on the previous day behind UTC - but at or ahead of UTC, where this project is marked, both readings give the same calendar day. Verified by substituting the old expression and watching every card pass. parseLocalDate is pinned where the difference is observable, in api/dates.spec.ts, by asserting the parsed hour is zero. Second, handleDateSelect repeats the floor check internally and that repeat is not covered, for the reason setEditPAO\'s is not: jsdom does not dispatch clicks on disabled controls, so such a case would pass with the guard deleted. What is covered: the floor day itself stays selectable, which is the boundary paoPeriodHasElapsed draws for the period buttons beside this control, and FE-DEF-18\'s readonly field is pinned both as an attribute and as the fact that no value reaching the field emits anything.',
  },
  {
    file: 'src/__tests__/components/ShelfCard.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ShelfCard',
    prerequisite:
      'The component mounted with @vue/test-utils with ItemBadge rendered, and the badge read off its own props rather than its palette. No clock is faked: expiry dates are built as today plus n days in the local calendar, which puts local midnight of that day between n-1 and n days away at any hour in any zone, so daysUntilExpiry\'s ceiling is n. resolveExpiryDate and daysUntilExpiry stay real. No network access.',
    note: 'All seven rendered states of expirationInfo. The <=30 and <0 boundaries are asserted as pairs - day 30 warns and day 31 does not; day 0 warns and day -1 has expired - because either card alone holds with the comparison moved by one. Day 0 lands on the warning branch rather than the expired one because daysUntilExpiry normalises the -0 an expiry later today produces. Archived is checked first and covered with an expiry already long past, since labelling a finished product "Expired" would describe a problem already dealt with. A correction to a comment first written here: the delete control\'s @click.stop is defensive rather than load-bearing, because the delete button and the open-details handler are siblings rather than nested. Removing .stop changed nothing, which was confirmed by doing it.',
  },
  {
    file: 'src/__tests__/components/ArchiveLogSummary.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ArchiveLogSummary',
    prerequisite:
      'The component mounted with @vue/test-utils with an archived ShelfItem and a usageLifespan passed directly - the lifespan is computed and frozen by the parent, and covered there. No store, no router, no network.',
    note: 'The outcome mapping in the read direction; ArchiveLogForm covers it in the write direction. The pair that differs in wording - stored `discarded`, shown "Abandoned" - is pinned on both sides, because nothing else in the codebase states that they are the same thing and a drift on either half would archive a product under one word and read it back under another. The lookup is indexed by the stored string, so an unrecognised outcome is covered too: without the fallback it rendered undefined and took the colour class with it.',
  },
  {
    file: 'src/__tests__/components/ConfirmDeleteModal.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shared/ConfirmDeleteModal',
    prerequisite:
      'The component mounted with @vue/test-utils with a ShelfItem passed directly. No store, no router, no network.',
    note: 'The emit contract, with the direction of an accidental dismissal asserted explicitly: a click on the backdrop refuses and never confirms. For a destructive dialogue that is the only acceptable direction, since a backdrop wired to confirm would let a stray tap outside the card delete a shelf record. ShelfView\'s handling of the cancel is covered in that view\'s own spec (STC-28-TC-10).',
  },
  {
    file: 'src/__tests__/api/products.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/products',
    prerequisite:
      'Both HTTP paths mocked: the shared axios client and the bare axios call used for anonymous requests. localStorage cleared per test so the token branch is controlled. No network access.',
  },
  {
    file: 'src/__tests__/views/ExploreView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/ExploreView',
    prerequisite:
      'The view mounted with @vue/test-utils at an address on a vue-router memory history, because the address is this screen\'s input. Every child is stubbed: none is the subject, and several fetch on their own - the search input debounces its own searchProducts and would put its requests into the mock these cards count calls on. searchProducts is mocked; resolveCatalogState and pickTopRecommendations stay real. The catalogue cards mount as a guest deliberately, so that loadRecommendations returns before requesting anything and every recorded call is fetchCatalog\'s own. No network access.',
    note: 'The search cards pin the third occurrence of FE-DEF-30, whose first two were fixed in the mount order and the address watcher. Despite its name, SearchAutocompleteInput emits `search-submit` from a watcher on every keystroke rather than on submit, so binding it to this page\'s searchQuery re-ran filteredCatalog over whatever was already in memory - the previous term\'s at-most-100 results - and a half-typed search could report "No Formulation Matches" about a product the catalogue holds. The binding is gone, and the card asserts both halves: no request, and no silent narrowing of the grid. Note what this was NOT: mobile search did reach the server, on submit. What bypassed it was the live-typing preview. The two watcher cards are a matched pair - one requires a refetch when the address term changes, the other forbids one for a category change, since category and brand are applied client-side over the same response and only `q` and the price bounds are sent. Neither card alone would catch a guard rewritten to fire always or never. The groups appended after those three cover the address-driven category and brand filters, the category writer and the price controls. Two findings from them. First, a card of mine was vacuous when first written: it asserted the grid was empty after a failed price re-request, and passed with the clearing line deleted, because the grid is not rendered in the failed state at all. It now reads ProductShowcaseMarquee, which takes the catalogue as a prop and renders in every state - the same repair the ShelfView card needed. Two lines in already-cited cards had the related flaw of asserting the title of a stubbed EmptyState as text, which a stub never renders; both now check the component, and UTC-FE-79-TC-02 was retitled because a first load that fails has nothing to clear. Second, the sunscreen exception in cleanString is dead: a value equal to "sunscreen" does not end in s, so it has already failed the endsWith test before the exception is reached. Removing the clause changes nothing, which mutation confirmed, so there is nothing for a card to cover.',
  },
  {
    file: 'src/__tests__/views/ProductDetailView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/ProductDetailView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, its <Teleport> and three child components stubbed. getProductBySlug is mocked; resolveRequestFailure is left real. Navigation is asserted by spying on the real router rather than replacing it, so the call under test is the one the component makes. No network access.',
    note: 'Covers the header back control only. It sits in the sticky bar that renders in every state - loading, resolved and not-found alike - so these cards do not depend on which body branch is showing.',
  },
  {
    file: 'src/__tests__/components/ProductSpecContent.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/ProductSpecContent',
    prerequisite:
      'The component mounted with @vue/test-utils on a vue-router memory history with a fresh Pinia and cleared localStorage. ProductHeroSection is stubbed - it has its own spec, mounts its own router and runs its own safety check, none of which the overlay cards are about. The auth store is real, so the popup reason is read back off the store the application uses. No network access.',
    note: 'The guest overlay and the popup it opens do not contradict each other - the popup is a condensed restatement of the overlay - so the reported item here was an inconsistency rather than a defect, and is recorded as one. What was wrong: this was the only triggerLoginPopup reason in the codebase phrased as a question, and the question it asked ("Want to know more about this product?") is the one the user had just answered by clicking the overlay that asks it. The six other call sites and the guard\'s own default are all imperative. The safetyChecks card asserts all six labels render rather than only the satisfied ones, because a checklist that hid its failures would read as a clean bill of health. The tri-state cards read the state of each label rather than its marker glyph, deliberately: the markers are drawn with the text characters for a tick and a cross, where CompareFlagMarker uses SVG for the same three states, and pinning the glyphs would cement both a departure from the SVG-only icon rule of the project and a third copy of the rule that marker was extracted to hold. A defect found while writing this coverage, and fixed: awarenessStats returned lowPct 100 for a product with no ingredients, so the legend drew an entirely green bar titled "Safe / Low Awareness (0)" - no data read as a clean result. Recorded rather than covered: an ingredient with no awareness_tier sorts with the medium tier and is labelled medium in the list, but awarenessStats counts tiers by exact value, so the bar counts it as nothing and the list and the bar disagree about it. Whether that is reachable depends on a database column not visible from the API schema, which was not checked.',
  },
  {
    file: 'src/__tests__/views/CompareView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/CompareView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history with the four compare panels stubbed, at the address with no pair on it - that branch sets the error copy without issuing a request, so both back controls are on screen at once. getProductComparison is mocked. Navigation is asserted by spying on the real router. No network access.',
    note: 'Two distinct controls, not one. The header control is the same one the other two views carry. The error panel\'s is labelled "Return to Registry", which reads like it should push /explore - it does not, it unwinds, so a user who arrived from a product page is returned there rather than to a catalogue they were never on. It has its own card because the header cards cannot reach it.',
  },
  {
    file: 'src/__tests__/components/CompareIdentityHeader.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareIdentityHeader',
    prerequisite:
      'The component mounted with @vue/test-utils with a fresh Pinia, cleared localStorage and a CompareResponse passed directly - no router, no network. resolveMatchAvailability and describeMatchAvailability are the real shared readings, so these cards exercise the same helpers the product page and the explore card use. The session is set up per card, because whether a missing score is a failure is a fact about the viewer rather than the response.',
    note: 'The shared explanation line read product_a alone. The argument for that was sound and one case short, which is the part worth recording: signed-out and no-profile are properties of the session, so whenever either applies it applies to both columns and one sentence is correct for both - but scored and not-scored are properties of the individual product, so a pair can genuinely split between them. With A scored and B not, the line explained how to read a score B has not got; with the two reversed it announced a scoring failure directly above B\'s own percentage, and the unscored side had nothing on the page accounting for its empty badge. Both orderings are covered, because reading either column alone fixes one and leaves the other. The four-way availability reading is FE-DEF-31 and is covered here in full: a null score is the ordinary state for a signed-out visitor and for anyone who has not taken the quiz, and only the residual case is a failure.',
  },
  {
    file: 'src/__tests__/components/CompareFlagMarker.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareFlagMarker',
    prerequisite: 'The component mounted with @vue/test-utils with a state prop passed directly. No store, no router, no network.',
    note: 'The third state is the reason this component exists. `safety_flags` can omit a key, and drawing that as the red cross would state a fact about a formulation nobody recorded, so null draws a question mark and neither of the other two palettes.',
  },
  {
    file: 'src/__tests__/components/CompareSafetyChecklist.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareSafetyChecklist',
    prerequisite:
      'The component mounted with @vue/test-utils with CompareFlagMarker rendered and its state read off its own props. The CompareResponse comes from src/__tests__/fixtures/compare.ts, which the four panels that render one share, so their specs cannot disagree about what a comparison looks like. No store, no router, no network.',
    note: 'Two properties carry the panel. An omitted flag reads as unknown rather than as false, and the check is `!== undefined` rather than truthiness, so a recorded false is kept distinct from a missing key - a mutation to truthiness failed the card that separates them. And every row puts product A on the left and B on the right, which is what lets the page read without a legend per line; swapping the two sides failed three cards.',
  },
  {
    file: 'src/__tests__/components/CompareIngredientsGrid.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareIngredientsGrid',
    prerequisite: 'The component mounted with @vue/test-utils with the shared compare fixture, whose two products share Water and Glycerin - a base and a humectant rather than an active, which is the ordinary shape of a real comparison. No store, no router, no network.',
    note: 'A defect found while writing this coverage, and fixed. Both columns were headed "Unique Components Deck" directly under a banner listing what the two products share, while each iterated the product\'s whole product_ingredients; the backend builds shared_ingredients as the intersection of those same unfiltered id sets, so every shared ingredient appeared in the banner and in both "unique" decks at once. Relabelled "Full Ingredient List" rather than filtered, since filtering to the true set difference would change what the screen shows and that is the owner\'s decision. One card deliberately pins that shared ingredients appear in both columns, so the choice between the two cannot drift in with an unrelated edit. The empty-overlap sentence says "no identical active ingredients", which understates an empty list over all ingredients but is not false, and was left.',
  },
  {
    file: 'src/__tests__/components/CompareActivesMatrix.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareActivesMatrix',
    prerequisite:
      'The component mounted with @vue/test-utils with the shared compare fixture and KeyActivesGrid rendered. resolvePairConflictState and resolvePairConflicts stay real. No store, no router, no network.',
    note: 'The pair panel\'s three states are FE-DEF-32\'s: conflicts the engine found between these two products, a clear result scoped explicitly to the pair, and a panel that refuses to call an empty list clear when either product has no ingredients to check. One card here was vacuous when first written and the reason is worth recording. It asserted that "High" did not appear for a null severity, and forcing the chip to always render still passed it, because a null severity renders an empty chip rather than the word. It now asserts no chip is drawn, with the selector narrowed after it was found to match KeyActivesGrid\'s functional-group chips too. Recorded rather than covered: the per-product concerns keep the first four and drop the rest without saying so, which is a display choice rather than a defect.',
  },
  {
    file: 'src/__tests__/components/CompareSelectorModal.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Compare/CompareSelectorModal',
    prerequisite:
      'The component mounted with @vue/test-utils on a vue-router memory history. searchProducts is mocked; buildComparePath stays real, so the routed address is the one the application builds. No network access.',
    note: 'A defect found while writing this coverage, and fixed. The load caught and logged and did nothing else, so a failed request left a blank list under a footer asking the user to pick from it, and a search matching nothing was the same blank - empty by failure and empty by result on one screen, FE-DEF-09\'s shape in a third place. There is now a failed state with a retry and an empty state named after what was typed. The id fallback in the routed pair looks dead and is covered because it is not: a CompareResponse product carries no slug, so the id is what keeps this working the day a comparison result is passed back in as the base (FE-DEF-35).',
  },
  {
    file: 'src/__tests__/components/SkinTypeRecommendationsWidget.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/SkinTypeRecommendationsWidget',
    prerequisite:
      'The component mounted with @vue/test-utils on a vue-router memory history, with EmptyState and router-link rendered rather than stubbed. Both hosts\' specs assert only which props reach this widget, so its own DOM - the exact empty and failed sentences, the card metadata and where a card goes - is observable only here. No network access.',
    note: 'A defect found while writing this coverage, and fixed. The widget declares hideCatalogLink to suppress a catalogue link that would navigate back to the page the user is already on, and read it nowhere: the per-card link it once hid had been removed, and the one catalogue link left - the empty state\'s button - ignored it. ExploreView is the only host that passes it, so an empty ranking there offered "Explore Global Catalog" as the way to reach the page it was drawn on. The button is now withheld under the prop, and ExploreView\'s spec pins that it keeps passing it. Recorded rather than changed: userSkinType is declared and read nowhere either; both hosts pass it, and nothing renders wrongly for it. The failure panel is ordered ahead of the empty one, and a card covers both conditions holding at once, since a failed request also leaves the list empty.',
  },
  {
    file: 'src/__tests__/components/SimilarProductsWidget.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/SimilarProductsWidget',
    prerequisite: 'The component mounted with @vue/test-utils on a vue-router memory history. buildComparePath stays real. No network access.',
    note: 'Hidden entirely rather than drawn empty when there are no similar products, since a heading promising products similar to this over none would be a claim with nothing under it. The compare card routes base first, and a slug containing & and = is covered because the template used to write the query by hand with no encoding, which would have split it.',
  },
  {
    file: 'src/__tests__/components/IngredientAwarenessLegend.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/IngredientAwarenessLegend',
    prerequisite: 'The component mounted with @vue/test-utils with tier statistics passed directly - they are computed by ProductSpecContent and covered there. No store, no router, no network.',
    note: 'The bar is read left to right with the high tier first, and a tier with no ingredients is omitted rather than drawn as a zero-width segment. All-zero statistics draw an empty track, which is what ProductSpecContent now passes for a product with no ingredients on record.',
  },
  {
    file: 'src/__tests__/api/safety.spec.ts',
    feature: '#3 Skincare storage',
    module: 'api/safety',
    prerequisite:
      'Pure decision logic called directly with plain objects. No component mounting and no network access.',
    note: 'Pins FE-DEF-01, FE-DEF-02 and FE-DEF-03 from FRONTEND_DEFECTS.md: three call sites each treated a failed compatibility check as a passed one. blocksAction() must never return false for an unavailable outcome.',
  },
  {
    file: 'src/__tests__/components/SafetyCheckModal.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shared/SafetyCheckModal',
    prerequisite:
      'The component mounted with @vue/test-utils with its <Teleport> stubbed and every input passed as a prop, so each panel state is set directly. resolveSeverityBand and describeDuplicateOverlap stay real. Warning fixtures use the three alert types the backend emits and no others (app/core/services/compatibility_service.py lines 416, 477 and 509). No store, no router, no network.',
    note: 'The report the manual Safety Check opens, which ProductHeroSection\'s own spec stubs out entirely. Five panel states, each asserted against the other three headings so no two can render at once. isSafe reads the status rather than the list length, and a card holds that an empty warnings list with an unavailable status is not reported clean - FE-DEF-03 at the component. A modal that has checked but holds no status folds into the unavailable panel, the one that claims least, the same choice blocksAction makes. Recorded rather than covered: the skin-type line prints "Severity: High" without reading the warning\'s severity. That is accurate today, since the backend hardcodes High for that alert type, but it is the shape FE-DEF-25 removed from the chemical line. A warning whose alert type is none of the three would fall into neither group and render the risk header over no body; no such type exists today.',
  },
  {
    file: 'src/__tests__/router/guard.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'router/guard',
    prerequisite:
      'No router instance and no components - resolveNavigation is a pure function over the target route and the auth state, called directly with plain objects.',
    note: 'The guard sends a user with no skin type to set one before a route marked requiresSkinType. It guarded the skin profile page, which used to render a substitute skin type\'s real routine and actives for a user who had never been classified. Since the profile redesign (feat/19-quiz-redesign) no route sets requiresSkinType: /profile shows its own empty state instead, and router/profileRoute.spec.ts at the end of this record pins that. The guard\'s logic is unchanged, so these cards still describe it, with /profile as the example target.',
  },
  {
    file: 'src/__tests__/views/AuthCallbackView.spec.ts',
    feature: '#1 Authentication (supplementary)',
    module: 'views/AuthCallbackView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage per case. The shared axios client is mocked - this view posts to /auth/line inline rather than through authApi - and Vitest fake timers drive the three-second delay on the failure path. No network access.',
    note: 'authApi.spec.ts covers exchangeLineCode, which nothing in src/ calls; this screen is where the LINE exchange actually happens, and until now neither of its two redirect branches was exercised. The two differ only by whether the returned user carries a skin_type, so both are pinned: inverting that condition would send established users to a setup page and new users to a home screen personalised against nothing.',
  },
  {
    file: 'src/__tests__/stores/auth.spec.ts',
    feature: '#1 Authentication (supplementary)',
    module: 'stores/auth',
    prerequisite: 'Fresh Pinia instance and cleared localStorage per test. No network access.',
    note: 'Feature #1 already has hand-written entries and the owner scoped regeneration to Features #2, #3 and #4. These cards are supplementary - do not overwrite the existing Feature #1 entries without the owner deciding to adopt them.',
  },
  {
    file: 'src/__tests__/api/authApi.spec.ts',
    feature: '#1 Authentication (supplementary)',
    module: 'api/authApi',
    prerequisite: 'Global fetch stubbed and the shared axios client mocked. No network access.',
    note: 'exchangeLineCode() is currently unreferenced by application code - nothing in src/ calls it, and authentication runs through the LINE redirect flow in AuthCallbackView. It is covered because the Test Record documents it; the document should not imply the app exercises this path.',
  },
  // Appended after every existing entry, so registering the stepping work
  // moves none of the group IDs already cited in the Test Record.
  {
    file: 'src/__tests__/composables/useStepList.spec.ts',
    feature: '#4 Search and compare',
    module: 'composables/useStepList',
    prerequisite: 'The composable called directly with a ref or getter source and plain arrays. No component mounting and no network access.',
    note: 'The rule behind every "Show N more" control in the app. It reveals a fixed step per press instead of jumping from the first slice to the whole list, and reports the exact size of a last partial step so the label never promises more than it shows. It resets when the source array is replaced, keyed on identity rather than length, so a details modal re-pointed at another item does not open halfway down the previous one. Two clauses were removed after mutation testing showed they decided nothing; the guard that replaced one of them is pinned by a card that grows the list in place after a stray press - written first without the growth, that card passed with the guard deleted.',
  },
  {
    file: 'src/__tests__/components/ShowMoreControl.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/ShowMoreControl',
    prerequisite: 'The component mounted with @vue/test-utils with its counts passed directly. No store, no router, no network.',
    note: 'The one control every stepped list renders, so the wording is shared: "Show 4 more ingredients (7 left)", singular for a single remaining item ("Show 1 more conflict"), and "Show less" once past the first slice. It renders nothing when there is nothing to reveal or fold back.',
  },
  {
    file: 'src/__tests__/components/IngredientsExplained.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/IngredientsExplained',
    prerequisite: 'The component mounted with @vue/test-utils with an ingredient list passed directly. No store, no router, no network.',
    note: 'Five explanations, then four more at a time. It used to go from five straight to every explanation - 52 on the longest product in the live catalogue.',
  },
  {
    file: 'src/__tests__/components/KeyActivesGrid.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/KeyActivesGrid',
    prerequisite: 'The component mounted with @vue/test-utils with ingredient rows passed directly. No store, no router, no network.',
    note: 'Four actives, then four more at a time, with the full count kept in the header. The fold is opt-in: ItemDetailsModal asks for it, because the actives sit among several other sections there, and the compare matrix does not, because the actives are the subject of that panel. The fold card reads the v-show inline style directly rather than isVisible(), which reported the region visible after folding on an unattached mount even though its style was display none.',
  },
  {
    file: 'src/__tests__/components/TargetedConcernsSection.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/TargetedConcernsSection',
    prerequisite: 'The component mounted with @vue/test-utils with a shelf item passed directly. No store, no router, no network.',
    note: 'The section was headed "Targeted Skin Concerns" and renamed "Best Suited For" at the owner request, because on the product page "concerns" means warnings while these chips come from the good_for field of each ingredient - what the product helps with. The same change stopped the component reading ingredient_concerns titles into the chips: those are warnings, and one would have rendered as a benefit under the new heading. The shelf join does not select that relation today, so none ever appeared, but a card now pins that they never can. The catalogue placeholder "None" is skipped rather than listed. The file keeps its old name so imports and this module path hold.',
  },
  {
    file: 'src/__tests__/components/SafetyInspectionCard.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/SafetyInspectionCard',
    prerequisite: 'The component mounted with @vue/test-utils with warnings and a scan status passed directly. No store, no router, no network.',
    note: 'Warnings most severe first, two at a time, with the header count still stating the total - sorting first is what makes folding safe here, since the worst clash is always among those on screen. The Proceed Anyway dialogue deliberately does not fold, and that is pinned in its own spec, because it is the consent screen for adding a conflicting product.',
  },
  {
    file: 'src/__tests__/components/ConflictDetailsList.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shared/ConflictDetailsList',
    prerequisite:
      'The component mounted with @vue/test-utils with details passed directly. Fixtures in src/__tests__/fixtures/conflicts.ts follow the grouped warning shape from backend commit 88733e9 on feat/group-conflicts-by-product: one warning per clashing product, its ingredient pairs in details, most severe first. No store, no router, no network.',
    note: 'The inside of a merged conflict card. The backend now sends one warning per clashing product instead of one per ingredient pair - on live data one exfoliant produced eight near-identical cards against a single serum. This lists the pairs with their own explanations, two at a time, and names the product and the pair count. Skin-type alerts, which the backend leaves one per ingredient, are grouped the same way on the frontend by groupSkinTypeConflicts. In the Proceed Anyway dialogue nothing is folded, because the owner decided the consent screen never hides a conflict. A response without details renders exactly as before, so the frontend does not depend on the backend branch being merged first.',
  },
  {
    file: 'src/__tests__/components/SkinTypeReasons.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shared/SkinTypeReasons',
    prerequisite:
      'The component mounted with @vue/test-utils with reasons passed directly. Fixtures follow the SkinTypeReason shape from backend commit b4c7e66 on feat/skin-type-explanations: one reason per matched trait of the user code, in code order, each with the concern title and description when one exists. No store, no router, no network.',
    note: 'Why a skin-type alert fired. It used to say only that an ingredient triggers the user type, with no reason and no indication which letter matched. Each reason shows the concern and always the trait as a Flagged for label, so the twelve live triggers with no concern written yet still say which trait they are flagged for. A per-reason grade appears only with two or more reasons, since the backend grades the alert by its worst reason and one reason would only repeat the badge. The same change fixed the Safety Check report printing Severity High on every skin-type alert, which was accurate only while the backend graded them all High.',
  },
  {
    file: 'src/__tests__/components/ShelfStatusGuide.spec.ts',
    feature: '#3 Skincare storage',
    module: 'components/Shelf/ShelfStatusGuide',
    prerequisite:
      'The component mounted with @vue/test-utils with no props. It holds its own copy of the badge list and draws each with the ItemBadge component the shelf cards use. No store, no router, no network.',
    note: 'The key to the shelf card badges, added on owner feedback that the shelf page did not say what each badge meant or where archived products had gone. It explains the five badges a card can show, the separate In Routine marker, that archived products are hidden from All and reached through the Archived filter, and the default Needs attention first order. It starts folded, because the shelf is visited often and a returning user does not need the key each time.',
  },
  {
    file: 'src/__tests__/components/ExploreProductCard.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/ExploreProductCard',
    prerequisite:
      'The component mounted with @vue/test-utils with a product passed directly, its skin_match_score set per case. The badge wording and palette come from components/Catalog/matchBadge.ts, which the recommendation cards also use. No store, no router, no network.',
    note: 'One card in the Explore grid. On owner feedback the skin match badge moved from a 10px pill in the card footer to the top right of the card and was enlarged, since it is the one figure on the card that is about the viewer rather than the product. A score nobody computed, for a guest or a user with no skin type, stays small and reads Score Unavailable rather than 0 percent. The recommendation cards on the same page draw the same score with the same label and palette.',
  },
  {
    file: 'src/__tests__/router/scroll.spec.ts',
    feature: '#4 Search and compare',
    module: 'router/scroll',
    prerequisite:
      'No router instance and no components - scrollBehavior is a pure function over the target and source routes and the saved position, called directly with plain objects carrying only the fields it reads.',
    note: 'Where the window goes after a navigation. On owner report, each Explore category chip scrolled the page back to the top, away from the grid being filtered, because the chip writes the category into the address and every address change scrolled to the top. A route marked keepScrollOnQueryChange, which only Explore is, now keeps its place when only the query changes. Back and forward still restore the saved position and every other navigation still starts at the top.',
  },
  {
    file: 'src/__tests__/views/MatchMethodologyView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/MatchMethodologyView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, reached from another route so the back control has somewhere to return to. The wording it shares with the rest of the app is imported from api/products.ts. No store, no network.',
    note: 'How % Match works, and where the data shown in the app comes from. Added on owner request for transparency and sources. Each source is credited only for what it supplied: the backend traced the catalogue and found Open Beauty Facts supplied photos for three products and nothing else, while product details and the ingredient notes were written by the team and are marked not yet checked against a published source. The EU CosIng database, the Cosmetic Ingredient Review and PubChem are named as where sources are being looked for, not as what the notes rest on. A sources table is drafted on the backend (migration 0009, not applied) to attach checked citations later.',
  },
  {
    file: 'src/__tests__/api/sources.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/sources',
    prerequisite:
      'Pure functions called directly with plain objects in the shape backend feat/data-sources (6db0260, over migration 0009) sends. No network, no components.',
    note: 'Reads the published sources behind the data the app shows: ingredient_sources per claim, concern_sources, the sources on a conflict rule or a skin-type reason, and a product source_url. Added on owner request that every piece of data say what it is based on. Every reader is defensive, so a response from before the fields existed reads as no sources. Only http and https links are kept, because source rows are written by hand and a javascript: link in an href would run on click.',
  },
  {
    file: 'src/__tests__/components/SourceList.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/SourceList',
    prerequisite:
      'The component mounted with @vue/test-utils with entries built by the api/sources readers. No store, no router, no network.',
    note: 'The line of sources under an ingredient, concern or warning. An empty list reads "No published source linked yet" rather than disappearing, so the gap stays visible, as the owner asked and the backend advised. Links open in a new tab with rel noopener noreferrer, and a book with no link is named without one.',
  },
  {
    file: 'src/__tests__/composables/useCountUp.spec.ts',
    feature: '#4 Search and compare',
    module: 'composables/useCountUp',
    prerequisite:
      'A small component mounted with @vue/test-utils that counts up to a reactive target. Vitest fake timers drive requestAnimationFrame and performance, and matchMedia is overridden to report no reduced-motion preference, because the shared setup reports one so that every other spec reads final values at once.',
    note: 'The count-up behind the product page match ring: on owner request the ring fills and the number climbs from 0 to the score when a product is opened, and again when a withheld score is revealed. It eases out, moves from its current value when the target changes, lands on the target at once for a user who has asked for less motion, and stops its frames on unmount.',
  },
  // The redesigned skin quiz (feat/19-quiz-redesign). Its new groups live in
  // these three files rather than at the end of quizStore.spec.ts and
  // SkinQuizView.spec.ts: group numbers run on across files, so groups added
  // to those early files would have moved every group ID after them.
  {
    file: 'src/__tests__/data/quizQuestions.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'data/quizQuestions',
    prerequisite: 'Pure functions called directly on the question bank as shipped. No mocks, no components, no network.',
    note: 'The "About you" answer (female, male or prefer not to say) only chooses which questions are asked and in which wording. Female is asked about patches during pregnancy or hormonal treatment where male and unspecified are asked about darker patches in general, and male gets wording that includes shaving. Every sex is asked sixteen core questions, four per part.',
  },
  {
    file: 'src/__tests__/stores/quizScoring.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'stores/quizStore',
    prerequisite: 'Fresh Pinia instance and cleared localStorage per test. No mocks - the store is pure client-side state. Questions come from src/data/quizQuestions.ts as shipped.',
    note: 'The scoring rules of the redesigned quiz. A "not sure" or "doesn\'t apply" answer is no evidence: it is left out of the part\'s average rather than scored as the middle. The letter is the high one at an average of 2.5 or more. After a part\'s four core questions, an extra question is asked while fewer than two answers counted or the average sits exactly on 2.5, at most two per part. A part is a close call with fewer than two counted answers or an average within 0.25 of 2.5. With no counted answer at all after both extra questions, the part ends with a "your choice" question and takes the letter the user picks (this replaced a fixed default letter; its own cards are in quizSelfChoice.spec.ts at the end). The save sends each part\'s average to 2 dp (2.5 for a part with no evidence), its counted answers as <part>_n, and version 2, all numbers, which the backend\'s scores Dict[str, float] accepts unchanged. The "About you" answer is held in memory only, never in localStorage or the save.',
  },
  {
    file: 'src/__tests__/views/SkinQuizFlow.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinQuizView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage per case (src/__tests__/fixtures/quizView.ts). saveSkinType and updateUserSkinType are mocked; the quiz store, auth store and toast composable are real. Vitest fake timers drive the 220ms auto-advance and the 1400ms calculating beat. The shared setup reports reduced motion, so answers move on at once; the cases about the pause override matchMedia for their run. No network access.',
    note: 'The steps of the quiz on screen: the start screen and "I already know my type", answering with auto-advance, the part-complete screen, the result with its two exits ("Save my skin type" keeps the redirect and the LINE close; "See what CODE means" saves the same way, then opens /profile), "Retake this part", and the motion between steps. VTU stubs <Transition>, so the motion cards read the transition name (quiz-step-forward or quiz-step-back), each question\'s key and the animation delays, never what moves on screen. The movement itself can only be seen in a browser, so these cards are not evidence of it.',
  },
  // The redesigned skin profile page and its empty state, on the same branch.
  // New files at the end, for the same reason as the quiz files above.
  {
    file: 'src/__tests__/views/SkinProfilePage.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinProfileView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history and attached to the document, so focus is read off document.activeElement. Fresh Pinia, cleared localStorage and emptied toasts per case; the skin type is written into the real auth store with setAuth. searchProducts and updateUserSkinType are mocked; the comparison sheet, the type selector and the recommendations widget render for real, with <Teleport> stubbed so they render in place. The skinProfiles and typologyDetails dictionaries are used as shipped. No network access.',
    note: 'The redesigned profile page: the type card, the four trait cards, what the skin needs ("Look for" and "Best avoided", which replaced "Avoid Inside"), the routine with Morning / Evening tabs on a phone and both columns from lg, the common concerns, the recommendations, and the links to the quiz and the chat. Everything shown comes from the existing dictionaries; nothing new is written about skin. A trait card opens the comparison sheet on its pair; next and previous wrap round the four, and closing gives focus back to the card that opened it. With no skin type, or a stored code that is not one of the sixteen, the page shows an empty state with "Take the skin quiz" and "I already know my type" (the same selector and save the quiz start screen uses) and asks for no recommendations; a code such as "toString" counts as unreadable. Both layouts are in the DOM and switched by CSS breakpoints, which jsdom does not apply, so these cards read each layout\'s own elements rather than which one is visible. VTU stubs <Transition>, so the motion cards read class names and delays, never what moves.',
  },
  {
    file: 'src/__tests__/components/TypologyComparisonSheet.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'components/Quiz/TypologyComparisonModal',
    prerequisite:
      'The component mounted open with @vue/test-utils on real records from src/data/typologydata.ts, attached to the document so focus and document-level key presses behave as on a page. <Teleport> and the nested ImageZoomModal are stubbed. No network access.',
    note: 'The sheet\'s own rules, added with the profile redesign: previous and next name the neighbouring pairs and wrap at the ends, the host does the stepping, one dot per trait with the current one wide, and the pair slides the way the user steps. As a dialog it is aria-modal and labelled by its heading, takes focus onto its close button as it opens, closes on Escape (or closes the full-screen photo first when that is open), keeps Tab inside itself, and stops listening for keys once closed or removed. The earlier cards for its panels, zoom and close are in TypologyComparisonModal.spec.ts above.',
  },
  {
    file: 'src/__tests__/router/profileRoute.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'router/index',
    prerequisite:
      'The real route table, read through router.getRoutes(). It is imported by a path held in a variable so vue-tsc does not follow it (router/index pulls in every view and does not type-check under tsconfig.vitest.json); Vitest still loads the real module. No components mounted and no network access.',
    note: 'The one route change in the profile redesign: /profile keeps requiresAuth and drops requiresSkinType, so a user with no type reaches the page and its empty state rather than being sent to the setup page. Every other route\'s meta is pinned as it was, and no route now requires a skin type.',
  },
  // Follow-up cards on the same branch, for rules an independent mutation run
  // found unpinned, and the profile actions' placement. New files at the end,
  // so every earlier group keeps its number.
  {
    file: 'src/__tests__/stores/quizPersistence.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'stores/quizStore',
    prerequisite:
      'A Pinia set up as src/main.ts sets it up: pinia-plugin-persistedstate installed, and the Pinia installed on an app so the plugin is applied. A control store with persist: true shows the plugin is live in the test. localStorage and sessionStorage cleared per case. No mocks and no network access.',
    note: 'The "About you" answer stays in memory even with the plugin the app installs, which would write any store given a persist option to storage. The quiz store has no persist option, so the plugin gives it no $persist or $hydrate, writes nothing for it, and reads nothing back for it. The privacy card in quizScoring.spec.ts uses a plain Pinia with no plugin, so it could not see this.',
  },
  {
    file: 'src/__tests__/views/SkinQuizEdgeCases.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinQuizView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage and sessionStorage per case (src/__tests__/fixtures/quizView.ts). The privacy case mounts on a Pinia with pinia-plugin-persistedstate installed, as src/main.ts does. saveSkinType and updateUserSkinType are mocked; the quiz store, auth store and toast composable are real. Vitest fake timers drive the 220ms auto-advance and the 1400ms calculating beat; the cases about the pause override matchMedia to report no reduced-motion preference. No network access.',
    note: 'Rules the earlier quiz cards reached but did not pin, each found by an independent mutation run: the "About you" answer leaves no trace in storage when picked on screen; the second extra question says "Only one ... counted" once the first extra answer counted; Back during the 220 ms pause cancels the pending move on; leaving after only "About you" asks first; a retaken part\'s complete screen names the result as next; "See what CODE means" is disabled while saving, so a double click sends one save; and the question counts read "Question N of 4" and "Extra question N of up to 2" from 1. The last group pins an owner decision made with them: the 1400 ms "Calculating your profile" beat plays after a full run of the quiz, but Continue at the end of a retaken part goes straight back to the result.',
  },
  {
    file: 'src/__tests__/views/SkinProfileLayout.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinProfileView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and the skin type written into the real auth store with setAuth. searchProducts and updateUserSkinType are mocked; <Teleport> is stubbed. jsdom applies no CSS, so which copy each width shows is read off the Tailwind display classes (hidden, lg:hidden, lg:flex) on an element and its ancestors. No network access.',
    note: 'Where the profile actions sit. On a phone they come at the very end, after the recommendations, as in the approved phone design; from lg they sit in the left column under the type, as in the desktop design. The block is placed twice, one copy per width, and the other copy is not displayed, so each width has one set of controls. Nothing on the page is moved with a CSS order class, so the phone order these cards read from the document is also the order a keyboard and a screen reader follow. What is actually on screen at each width can only be confirmed in a browser.',
  },
  // The "your choice" question, an owner decision on the same branch, which
  // replaced the fixed default letter for a part where nothing counted.
  {
    file: 'src/__tests__/stores/quizSelfChoice.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'stores/quizStore',
    prerequisite: 'Fresh Pinia instance and cleared localStorage per test. No mocks - the store is pure client-side state. Questions, including SELF_CHOICE_QUESTIONS, come from src/data/quizQuestions.ts as shipped.',
    note: 'The owner-approved last resort for a part where nothing counted. Only when a part still has no counted answer after its core questions and both extra questions does it end with a "your choice" question: two rows, the high letter first, and no skip buttons. Not with one counted answer, and not on a tie. The pick decides the letter and is stored as its own kind; it is never counted, averaged or treated as a skip. The save keeps the threshold and 0 counted for such a part and adds <part>_choice: 1, a number to fit the backend\'s scores Dict[str, float]; parts without a pick leave the key out. Going back from it returns to the second extra question; changing an earlier answer so one counts removes the step and stops using the pick; "Retake this part" clears the pick.',
  },
  {
    file: 'src/__tests__/views/SkinQuizSelfChoice.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'views/SkinQuizView',
    prerequisite:
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage per case (src/__tests__/fixtures/quizView.ts). saveSkinType and updateUserSkinType are mocked; the quiz store, auth store and toast composable are real. Vitest fake timers drive the 220ms auto-advance and the 1400ms calculating beat; the case about the pause overrides matchMedia to report no reduced-motion preference. No network access.',
    note: 'The "your choice" question on screen: a neutral banner ("One last question for this part"), the heading "Which sounds more like your skin, most days?" and two rows with no skip buttons, marked in the progress bar like an extra question and moving on like the other steps. The part-complete screen shows "You chose oily" (etc.), the amber "Close call · your choice" chip and the marker at the centre; the result card says the same and still offers "Retake this part". The save adds <part>_choice: 1 for that part only. VTU stubs <Transition>, so the motion case reads the transition name and the step\'s key, never what moves on screen.',
  },
  {
    file: 'src/__tests__/api/productComparison.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/products',
    prerequisite:
      'Both HTTP paths mocked: the shared axios client and the bare axios call used for anonymous requests. localStorage cleared per test so the token branch is controlled. No network access.',
    note: 'Backend fix/expired-login-401 makes the optional-auth product routes answer an expired or invalid login with 401 instead of a guest result. Search and the product page already retried as a guest; compare did not, so an expired login made the comparison fail behind the login popup. It now retries as a guest the same way, and still surfaces any other failure.',
  },
  {
    file: 'src/__tests__/api/optionalAuth.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/optionalAuth',
    prerequisite:
      'Both HTTP paths mocked: the shared axios client and the bare axios call used for guest requests. localStorage cleared per test so the token branch is controlled. The guard cases read the api/*.ts sources as text through import.meta.glob. No network access.',
    note: 'The one shared guest fallback for optional-auth routes, which replaced three copies of the same logic in api/products.ts (search, slug and compare). With no stored login it sends a guest request; with one it uses apiClient; on 401 it repeats the request as a guest, so the page loads behind the login popup; any other failure is rethrown. The guard cases pin that only the product module uses it, and that the product module never calls apiClient directly, so a protected route cannot gain a guest retry by mistake.',
  },
  {
    file: 'src/__tests__/components/ProductPackClaims.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/ProductPackClaims',
    prerequisite:
      'The component mounted with @vue/test-utils with a product object passed directly. For the getProductBySlug case, both HTTP paths are mocked (the shared axios client and the bare axios call used for guests) and localStorage is cleared, so the request goes out as a guest. No network access.',
    note: 'Migration 0013 gives products good_for (concern tags), benefits and pao_months, shown on the product page under the description, headed as what the brand says. Only what an admin published at approve, or set in an edit, reaches these fields. Empty or null shows nothing. The updated_at case pins that the product read keeps the timestamp as the exact string sent: PATCH /products/{id} needs it back unchanged, and a trip through new Date() would drop the microseconds.',
  },
  {
    file: 'src/__tests__/components/NullIngredientBenefits.spec.ts',
    feature: '#4 Search and compare',
    module: 'components (IngredientsExplained, KeyActivesGrid, CompareIngredientsGrid)',
    prerequisite:
      'Each component mounted with @vue/test-utils with ingredient rows passed directly; the compare grid uses the shared compare fixture with its lists replaced. No store, no router, no network.',
    note: 'Since migration 0013 an ingredient approved "name only" has null benefits and no functional group. The three screens that show ingredient notes now say "No description yet" (or show no label) instead of the old filler sentences and the "Formulation Base" / "Base" labels, which were claims about an ingredient nobody had described. Two existing cases that pinned the old fallback text were rewritten in place, keeping their IDs: the IngredientsExplained "explanations (render)" case and the CompareIngredientsGrid "ingredient decks (render)" case.',
  },
  {
    file: 'src/__tests__/api/apiProblem.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/apiProblem',
    prerequisite: 'Pure function over a thrown error object built in the test. No mocks, no network.',
    note: 'One reading of the three error shapes the submission routes answer with: a route error ({"detail": text}), a database-function error ({"detail", "code", "details"}) and a Pydantic 422 list. A null status means no answer arrived, which the screens word differently from any server answer.',
  },
  {
    file: 'src/__tests__/api/metaApi.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/metaApi',
    prerequisite:
      'Bare axios and the shared apiClient both mocked; the in-memory cache cleared and localStorage emptied per case. No network access.',
    note: 'The categories, concern tags and functional groups come from the backend, which validates against the same lists. They are public routes, so they go out with no login, and a stale stored login cannot open the login popup.',
  },
  {
    file: 'src/__tests__/api/ingredientsApi.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/ingredientsApi',
    prerequisite: 'Bare axios and the shared apiClient both mocked; localStorage emptied per case. No network access.',
  },
  {
    file: 'src/__tests__/api/submissionsApi.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/submissionsApi',
    prerequisite:
      'The shared apiClient mocked (these are protected routes), and bare axios mocked to show it is never used for them. No network access; nothing is uploaded or posted to the live backend.',
  },
  {
    file: 'src/__tests__/composables/useAdmin.spec.ts',
    feature: '#4 Search and compare',
    module: 'composables/useAdmin, api/accountApi',
    prerequisite:
      'The shared apiClient mocked so GET /auth/me answers with a chosen role. A fresh Pinia per case with the real auth store; the module-level role state reset per case. No network access.',
    note: 'isAdmin decides only what the page offers (the Review submissions menu item, the admin route guard). It is never a security check: every admin route answers 403 to anyone else. The role belongs to the login it was read with, so a sign-out or a different account reads as not an admin until asked again.',
  },
  {
    file: 'src/__tests__/router/adminGuard.spec.ts',
    feature: '#4 Search and compare',
    module: 'router/guard (requiresAdmin)',
    prerequisite:
      'resolveNavigation called directly for the rule cases. The wiring cases load the real router (by a path held in a variable, as profileRoute.spec does) with apiClient mocked, a fresh Pinia and the role state reset per case. No network access.',
    note: 'A signed-in user known not to be an admin is sent to the error page with an explanation. A role that could not be read lets the navigation through, so a failed check does not lock an admin out; the admin pages handle the backend 403 themselves.',
  },
  {
    file: 'src/__tests__/components/submissionDraft.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/submissionDraft',
    prerequisite: 'Pure functions over draft objects built in the test. No mocks, no network.',
    note: 'The rules of the submit form, kept out of the components: the checks for each step, the POST /submissions body, and the reading of a server 422 (field paths and SBUNK) back onto the form fields.',
  },
  {
    file: 'src/__tests__/components/IngredientCombobox.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/IngredientCombobox',
    prerequisite:
      'The component mounted with @vue/test-utils and attached to the document; searchIngredients mocked; Vitest fake timers drive the 250 ms typing pause. No network access.',
  },
  {
    file: 'src/__tests__/views/SubmitProductView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/SubmitProductView',
    prerequisite:
      'The view rendered through a real RouterView on a memory history (the leave warning is a route guard), with a fresh Pinia and Teleport stubbed. The meta lists, the image upload, createSubmission, searchIngredients and matchIngredients are mocked; the draft rules and the step components are real. Each view is unmounted after its case. No network access.',
    note: 'The whole submit flow as a user meets it: the three steps, inline errors with aria-invalid and aria-describedby and focus on the first one, the photo checks, search, paste-and-match with "Pick one", reordering, the body sent, server refusals read back onto the fields, the done state, and the leave warning (dialog and beforeunload).',
  },
  {
    file: 'src/__tests__/views/MySubmissionsView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/MySubmissionsView',
    prerequisite:
      'The view mounted with @vue/test-utils on a memory history, attached to the document; getMySubmissions mocked. No network access.',
  },
  {
    file: 'src/__tests__/components/SubmissionEntryPoints.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/ExploreView, components/Shared/TopNav, components/Shared/MobileTopBar, App',
    prerequisite:
      'Each component mounted with @vue/test-utils on a memory history with its children stubbed; searchProducts and the shared apiClient (for GET /auth/me) mocked; a fresh Pinia and the role state reset per case. No network access.',
    note: 'Where a user finds the submit flow: the Explore no-results state and the card under the results, My submissions in both account menus, and the admin-only Review submissions item. The App cases pin that the site navigation is hidden on /submissions/new only (their memory router marks that route meta.fullScreen, as the real one does). Since feat/23 the desktop user menu lives in the sidebar (components/Shared/AppSidebar) and TopNav holds only the search, so the TopNav user menu cases mount the sidebar, and the App cases check the sidebar is hidden and shown with the rest of the navigation.',
  },
  {
    file: 'src/__tests__/api/adminSubmissionsApi.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/submissionsApi (admin), api/productAdminApi',
    prerequisite:
      'The shared apiClient mocked (admin routes), and bare axios mocked to show it is never used for them. No network access; nothing is approved, rejected, patched or uploaded on the live backend.',
    note: 'The review queue, the review detail (duplicate candidates with exact, ingredients with existing_matches), corrections, approve, reject, and the product edit and photo upload. The PATCH /products case pins that updated_at is sent exactly as given.',
  },
  {
    file: 'src/__tests__/components/adminReview.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/adminReview',
    prerequisite: 'Pure functions over review details built in the test; VITE_SUPABASE_URL stubbed for the photo address case. No mocks of the network, no network access.',
    note: 'The review rules kept out of the components: the queue card flags, what blocks Publish (an exact duplicate, a name matching several ingredients, a missing decision or functional group, dropping everything, unsaved corrections, the old format), the approve body with 0-based positions and only ticked extras, the corrections PATCH, and the plain words for every refusal code (409 duplicate, SBNPD, SBDEC, SBNON, SBLEG, SBAMB, SBFGR, SBUNK, SBVAL, 23514, 500).',
  },
  {
    file: 'src/__tests__/components/productEdit.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/productEdit',
    prerequisite: 'Pure functions over a product object built in the test. No mocks, no network.',
    note: 'The product edit rules: updated_at kept as the exact string read, only changed fields sent, the photo sent by its upload path or as null, the ingredients replaced in order, sources kept one per fact, and the refusals read into the stale banner, the duplicate clash, the 403 state or field errors.',
  },
  {
    file: 'src/__tests__/views/AdminSubmissionsView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/AdminSubmissionsView (AdminQueuePanel, AdminReviewPanel, AdminIngredientDecision, ConfirmDialog)',
    prerequisite:
      'The view rendered through a real RouterView on a memory history, attached to the document, with a fresh Pinia and Teleport stubbed. The admin submission calls, the meta lists and the ingredient search are mocked; the review rules and the components are real. No network access.',
    note: 'The review screens as an admin meets them: tabs and counts, the designed empty state, a failed load with retry, the exact and close duplicate warnings, existing matches (none, one, several) and picking one, the decision cards, the publish ticks, the publish dialog (focus, Escape, focus return), approve and reject, refusals on screen, a legacy row converted, and the 403 state.',
  },
  {
    file: 'src/__tests__/views/ProductEditView.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/ProductEditView, components/Catalog/ProductHeroSection (Edit product link)',
    prerequisite:
      'The view rendered through a real RouterView on a memory history, attached to the document, with a fresh Pinia and Teleport stubbed. getProductBySlug, updateProduct, uploadProductPhoto, the meta lists, the ingredient search and GET /auth/me (fetchMyRole) are mocked. No network access.',
    note: 'The admin product edit: the exact updated_at echoed, only changed fields sent, the photo uploaded before the save, the ingredient list replaced in order, sources by fact, the stale banner with Reload their version, the duplicate clash, field errors, the 403 state, the unsaved-changes guard, and moving to the slug the save returns. The last group pins that the Edit product link shows to admins only, on the product page only.',
  },
  {
    file: 'src/__tests__/components/submissionRuleGaps.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/adminReview, components/Submissions/productEdit',
    prerequisite: 'Pure functions over a review detail and a product object built in the test. No mocks, no network.',
    note: 'Cases an independent verifier found missing: each rule here could be removed with every earlier case still passing. An ingredient\'s own link is published only when the admin ticks that they opened it; every refusal code the product edit reads (SBNON, SBAMB, SBVAL, 23514, 401, 404, no answer) has its own words; and a source with no web link is never sent in the PATCH, while the page still lists it as having none.',
  },
  {
    file: 'src/__tests__/views/ProductPagesFollowUp.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Catalog/ProductSpecContent, views/ProductEditView (sources), App and router (full-screen routes), components/Shared/MobileTopBar, components/Catalog/ProductHeroSection',
    prerequisite:
      'Each component mounted with @vue/test-utils on a memory history with a fresh Pinia. ProductSpecContent has the product hero and the ingredient explainer stubbed. ProductEditView is rendered through a real RouterView, attached to the document, with Teleport stubbed and getProductBySlug, updateProduct, the meta lists and the ingredient search mocked. App is mounted on a memory history built from the route records of the real router (loaded by a path held in a variable), with RouterView and the navigation components stubbed. MobileTopBar and ProductHeroSection mounted on a memory history with fetchMyRole (GET /auth/me) and analyzeProduct mocked, and the role state reset per case. No network access.',
    note: 'A name-only ingredient (one added without details) has no functional group, and the list shows none for it rather than the "Skin Conditioning" it used to print for any ingredient without one. On the product edit page a source with no web link is never sent in the PATCH while the warning about it stays, and a stored URL that is not http or https (a javascript: value in the case) is shown as text, never as a link. The submit route is full screen by its meta.fullScreen, as the product edit route is, so /submissions/new/ with a trailing slash hides the site navigation too; the quiz, the profile setup and My submissions are unchanged. The mobile cog names the account menu in aria-controls only while the menu exists. The product page asks for the role again whenever the login changes, so an admin who signs in there sees Edit product without navigating; the explore preview never asks.',
  },
  {
    file: 'src/__tests__/views/AdminReviewSafety.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/ConfirmDialog, components/Submissions/AdminReviewPanel, components/Submissions/AdminIngredientDecision',
    prerequisite:
      'ConfirmDialog mounted with @vue/test-utils inside a host that drives busy, with the real Teleport (the Teleport stub re-creates its content on every patch, which would move focus by itself). The review panel rendered through a real RouterView on a memory history with Teleport stubbed; the admin submission calls, the meta lists and the ingredient search mocked. Both attached to the document. No network access.',
    note: 'While busy both dialog buttons are disabled, and a disabled button cannot hold focus, so the dialog itself takes it (tabindex -1, aria-busy) and Tab and Escape still reach its handler. After a refused publish, focus goes back to Publish when it is still on, and to the review heading when the refusal turned it off. A link the sender typed (a product source, or the link given for an ingredient) becomes a link only when it is an http or https address; a javascript: value is shown as text.',
  },
  {
    file: 'src/__tests__/utils/safeLinks.spec.ts',
    feature: '#4 Search and compare',
    module: 'utils/safeLinks',
    prerequisite: 'Pure functions over strings built in the test. No mocks, no network.',
    note: 'The one rule for turning a typed or stored address into a link: only http and https with a host, read the way the browser reads it (new URL), so javascript:, data:, a scheme hidden by a tab, and a scheme-relative address are refused. The host shown before a link is the real one, in punycode for a lookalike. A link a user sent is marked nofollow ugc.',
  },
  {
    file: 'src/__tests__/utils/safeImages.spec.ts',
    feature: '#4 Search and compare',
    module: 'utils/safeImages',
    prerequisite: 'Pure functions; VITE_SUPABASE_URL stubbed with vi.stubEnv, and URL.createObjectURL and URL.revokeObjectURL spied on. No network.',
    note: 'Where a submission or product photo may come from: the public address built from an upload path of the exact shape submissions/<uuid>.(jpg|png|webp) or products/<uuid>.(jpg|png|webp), a product image_url that is http(s), or a local preview of the file just picked, released once. A path with "../", a javascript: value, an http address in image_path and a wrong extension are refused.',
  },
  {
    file: 'src/__tests__/utils/hiddenChars.spec.ts',
    feature: '#4 Search and compare',
    module: 'utils/hiddenChars',
    prerequisite: 'Pure functions over strings built in the test. No mocks, no network.',
    note: 'Invisible characters - the set the backend removes from submitted text: U+00AD, U+061C, U+180E, U+200B-U+200F, U+202A-U+202E, U+2060-U+2064, U+2066-U+206F, U+FEFF, U+FFF9-U+FFFB, the tag characters U+E0000-U+E007F and lone surrogates - are found, shown as visible markers such as [U+202E], or taken out; characters just outside those ranges, Thai and accented letters are left alone. The extra ranges, the tag characters and lone surrogates are pinned in UTC-FE-392 (SubmissionHardening.spec).',
  },
  {
    file: 'src/__tests__/components/submissionHardeningRules.spec.ts',
    feature: '#4 Search and compare',
    module: 'api/apiProblem, components/Submissions/submissionDraft, components/Submissions/adminReview, components/Submissions/productEdit',
    prerequisite: 'Pure functions over refusals and drafts built in the test. No mocks, no network.',
    note: "The refusals from the backend's submission hardening, worded once: a 429 (the rate limit or the cap on submissions waiting) and the 413, 415 and 422 photo refusals in the backend's detail text when it is plain text, with words of our own per status otherwise. A link refused as a Pydantic field error (sources.N.url, ingredients.N.details.source_url) lands on that link card, ingredient link or product fact, with the backend's msg. The submit body carries no hidden character, and the approve body publishes only web links.",
  },
  {
    file: 'src/__tests__/components/safeDisplay.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/ExternalLink, components/Submissions/RevealedText, components/Submissions/HiddenCharsNotice',
    prerequisite: 'Each component mounted on its own with @vue/test-utils. No mocks, no network.',
    note: 'ExternalLink renders a link only for an http(s) address, in a new tab with the rel for who supplied it, and the fallback slot otherwise; with show-host the real host comes first. RevealedText shows hidden characters as markers with a warning and markup as text. HiddenCharsNotice offers to remove hidden characters from an input.',
  },
  {
    file: 'src/__tests__/components/noRawHtmlGuard.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Submissions/*, views/SubmitProductView, views/MySubmissionsView, views/AdminSubmissionsView, views/ProductEditView, components/Catalog/ProductPackClaims, components/Shared/ExternalLink, components/Shared/SourceList',
    prerequisite: "The files' source text, read with import.meta.glob ('?raw'). No mocks, no network.",
    note: 'A guard on the code itself: no file that shows user-submitted text uses v-html, innerHTML, outerHTML or insertAdjacentHTML, and none binds :href or :src straight to a value; links go through ExternalLink and photos through safeImageSrc. The chat markdown (sanitised, owned by the teammate) is not in scope.',
  },
  {
    file: 'src/__tests__/views/SubmissionHardening.spec.ts',
    feature: '#4 Search and compare',
    module: 'views/AdminSubmissionsView (AdminQueuePanel, AdminReviewPanel, AdminIngredientDecision), views/ProductEditView, views/SubmitProductView (SubmitBasicsStep)',
    prerequisite:
      'Each view rendered through a real RouterView on a memory history, attached to the document, with a fresh Pinia and Teleport stubbed. The submission and product admin calls, the product read, the meta lists and the ingredient search and match are mocked; URL.createObjectURL and URL.revokeObjectURL are spied on and VITE_SUPABASE_URL stubbed where a case needs them. Each view is unmounted after its case. No network access.',
    note: "The hardening as an admin and a user meet it: a sent link's host shown first and marked nofollow ugc, no tick to publish a link that is not a web address, hidden characters shown as markers everywhere on the review and the edit form (and removed only when the admin asks), photos only from an upload path or the picked file and released when replaced or the page closes, and the 429, photo and link refusals shown on the field or at the top of the form. The later groups use the backend's confirmed answers word for word (fix/submission-hardening 7863dd1): the pending-cap and upload 429s, the 413, 415 and 422 photo texts, a local-host link refused at each loc (sources.i.url, ingredients.i.details.source_url, publish_source_urls.i) landing on its field or row with \"Value error,\" taken off, and a name cleaned to nothing (string_too_short) on the name field; then the full invisible-character set, and refusals named in words rather than request paths.",
  },
  {
    file: 'src/__tests__/components/SiteNavigation.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/AppSidebar, components/Shared/TopNav, App, components/Shared/MobileTopBar',
    prerequisite:
      'Each component mounted with @vue/test-utils on a memory history, attached to the document, with a fresh Pinia and the role state reset per case. The shared apiClient is mocked (GET /auth/me, read by fetchMyRole); the search input is stubbed in TopNav and MobileTopBar, and App has its navigation components stubbed. No network access.',
    note: 'The desktop layout (feat/23, layout B): a sidebar replaces the top-bar links and user menu, and TopNav keeps only the search at its 80px height. Explore\'s categories open by default under /explore and a click on the toggle wins until the next page (a query change on Explore is not one). Review is offered to an admin only, the role being asked for as soon as someone is signed in. The account menu opens for a signed-in user only; a guest is asked to sign in. The cases in UTC-FE-325 (TopNav user menu) were moved in place onto the sidebar, where that menu now lives.',
  },
  {
    file: 'src/__tests__/components/SearchSubmitEntry.spec.ts',
    feature: '#4 Search and compare',
    module: 'components/Shared/SearchAutocompleteInput, components/Submissions/submissionDraft (nameFromQuery, prefillName), views/SubmitProductView',
    prerequisite:
      'SearchAutocompleteInput mounted on a memory history with searchProducts mocked and Vitest fake timers driving its 250ms debounce. SubmitProductView rendered through a real RouterView with getCategories and getConcernTags mocked and Teleport stubbed. The draft helpers are called directly. No network access.',
    note: 'The search suggestions as a way in to submitting a product: with no match, a plain message and a row that starts the form with the typed name (a location object, so & # = ? survive); with matches, a quiet last row. The form reads ?name= once on mount, as one string only, with hidden characters taken out, trimmed and cut to the 200-character name limit without splitting a character, and never over a name already typed.',
  },
]

function runSuite() {
  mkdirSync(dirname(RAW_RESULT), { recursive: true })
  rmSync(RAW_RESULT, { force: true })

  // Invoke Vitest's own entry with the current node binary rather than going
  // through `npx`: on Windows that resolves to npx.cmd, which Node refuses to
  // execFile without a shell.
  const vitestBin = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')
  try {
    execFileSync(
      process.execPath,
      [vitestBin, 'run', '--reporter=json', `--outputFile=${RAW_RESULT}`],
      { cwd: ROOT, stdio: 'inherit' },
    )
  } catch {
    // A non-zero exit means failing tests, and Vitest still writes the results.
    // A failed case must appear in the document as F rather than vanishing, so
    // carry on - but only if the results file actually exists (below).
    console.warn('\n[test-record] Suite reported failures - they will be recorded as F.\n')
  }

  if (!existsSync(RAW_RESULT)) {
    throw new Error(
      `Vitest produced no results at ${RAW_RESULT}. The suite could not be run, so no ` +
        `record was generated - refusing to emit a document with no evidence behind it.`,
    )
  }
  return JSON.parse(readFileSync(RAW_RESULT, 'utf8'))
}

/** Group a file's assertions by their second-level describe (the method under test). */
function groupByMethod(assertions) {
  const groups = new Map()
  for (const a of assertions) {
    const method = a.ancestorTitles[1] ?? a.ancestorTitles[0] ?? '(ungrouped)'
    if (!groups.has(method)) groups.set(method, [])
    groups.get(method).push(a)
  }
  return groups
}

const escapePipes = (s) => String(s).replace(/\|/g, '\\|')

function actualOutput(a, specFile) {
  const id = `${specFile} > ${a.fullName}`
  if (a.status === 'passed') {
    return `Executed and passed in ${a.duration?.toFixed(1) ?? '0'}ms. All assertions in \`${id}\` held.`
  }
  if (a.status === 'failed') {
    const first = (a.failureMessages?.[0] ?? 'no message').split('\n')[0]
    return `Executed and FAILED. \`${id}\` - ${first}`
    }
  return `Not executed (status: ${a.status}). \`${id}\``
}

function build(result) {
  const byFile = new Map()
  for (const tr of result.testResults) {
    byFile.set(relative(ROOT, tr.name).split('\\').join('/'), tr.assertionResults)
  }

  const lines = []
  lines.push('# Frontend Unit Test Record (generated)')
  lines.push('')
  lines.push(
    '> **Generated file - do not edit by hand.** Produced by `tools/generate-test-record.mjs`',
  )
  lines.push('> from real Vitest output. Regenerate with `npm run test:record`.')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  // testResults is one entry per spec file; numTotalTestSuites counts describe
  // blocks, which reads as a misleadingly large "suite" count.
  lines.push(
    `**Result: ${result.numPassedTests}/${result.numTotalTests} passed** across ${result.testResults.length} spec files.`,
  )
  lines.push('')
  lines.push('## Reproducibility')
  lines.push('')
  lines.push(
    'No test in this suite performs network access. Every API module is replaced with a mock, so results are deterministic and repeatable on any machine, with or without a running backend. Each card names the exact Vitest test id so any single case can be re-run.',
  )
  lines.push('')
  lines.push('## ID numbering')
  lines.push('')
  lines.push(
    `IDs use the placeholder prefix \`${ID_PREFIX}-\`. The existing document runs UTC-01 to UTC-35 and the backend generator emits from UTC-36. **Agree a real range with the project owner before renumbering** - these must not collide with backend-generated groups.`,
  )
  lines.push('')

  let groupNo = 0
  let currentFeature = null

  for (const spec of SPEC_MAP) {
    const assertions = byFile.get(spec.file)
    if (!assertions) {
      console.warn(`[test-record] No results for ${spec.file} - skipping.`)
      continue
    }

    if (spec.feature !== currentFeature) {
      currentFeature = spec.feature
      lines.push('---')
      lines.push('')
      lines.push(`# Feature ${spec.feature}`)
      lines.push('')
    }

    for (const [method, cases] of groupByMethod(assertions)) {
      groupNo += 1
      const groupId = `${ID_PREFIX}-${String(groupNo).padStart(2, '0')}`

      lines.push(`## ${groupId}`)
      lines.push('')
      lines.push(`**Module:** \`${spec.module}\`  `)
      lines.push(`**Method Under Test:** \`${method}\`  `)
      lines.push(`**Spec file:** \`${spec.file}\`  `)
      lines.push(`**Prerequisite data:** ${spec.prerequisite}`)
      if (spec.note) {
        lines.push('')
        lines.push(`> **Note:** ${spec.note}`)
      }
      lines.push('')
      lines.push('| ID | Method Under Test | Prerequisite / Mock Setup | Input / Test Data | Expected Unit Output | Actual Unit Output | P/F |')
      lines.push('|---|---|---|---|---|---|---|')

      cases.forEach((a, i) => {
        const caseId = `${groupId}-TC-${String(i + 1).padStart(2, '0')}`
        const pf = a.status === 'passed' ? 'P' : a.status === 'failed' ? 'F' : '-'
        lines.push(
          [
            caseId,
            `\`${escapePipes(method)}\``,
            escapePipes(spec.prerequisite),
            `\`${escapePipes(a.fullName)}\``,
            escapePipes(a.title),
            escapePipes(actualOutput(a, spec.file)),
            pf,
          ].join(' | '),
        )
        lines[lines.length - 1] = `| ${lines[lines.length - 1]} |`
      })

      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('## Field derivation')
  lines.push('')
  lines.push('| Field | Source |')
  lines.push('|---|---|')
  lines.push('| ID | Assigned sequentially by the generator |')
  lines.push('| Method Under Test | The second-level `describe()` block in the spec |')
  lines.push('| Prerequisite / Mock Setup | `SPEC_MAP` in `tools/generate-test-record.mjs` |')
  lines.push('| Input / Test Data | The Vitest test id, which locates the exact inputs in the spec |')
  lines.push('| Expected Unit Output | The `it()` string, lifted verbatim |')
  lines.push('| Actual Unit Output | Observed run status and duration from the Vitest JSON reporter |')
  lines.push('| P/F | `passed` -> P, `failed` -> F |')
  lines.push('')

  return lines.join('\n')
}

const result = runSuite()
mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, build(result), 'utf8')
rmSync(RAW_RESULT, { force: true })

console.log(`\n[test-record] Wrote ${relative(ROOT, OUT_FILE)}`)
console.log(`[test-record] ${result.numPassedTests}/${result.numTotalTests} tests passed.`)
if (result.numFailedTests > 0) process.exitCode = 1
