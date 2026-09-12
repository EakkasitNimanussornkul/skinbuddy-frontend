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
      'The view mounted with @vue/test-utils on a vue-router memory history, with a fresh Pinia and cleared localStorage per case. saveSkinType is mocked; the quiz store, auth store and toast composable are all real. Vitest fake timers drive the 1400ms calculating beat that gates the results panel. No network access.',
    note: 'Every answer is given zero points, so finalSkinType resolves deterministically to DRNT and the saved payload can be asserted exactly. The quiz cannot be seeded as already finished instead: onMounted resets a store whose index is past the last question, so a pre-finished fixture is wiped before the first assertion - the cases answer all sixteen questions through the child component. The LIFF card is the only place in the codebase that exercises window.liff.',
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
      'The view mounted with @vue/test-utils on a vue-router memory history, its <Teleport> stubbed. The skin type under test is written into the real auth store with setAuth, because userSkinType reads authStore.user!.skin_type through a non-null assertion. searchProducts is mocked; pickTopRecommendations is deliberately left real, so the recommendation cards show the view actually narrowing a response. The skinProfiles and typologyDetails dictionaries are used as shipped - no fixture. No network access.',
    note: 'All four units are read through what the page renders: the report body for profileData, the four typology cards for axes, the comparison modal\'s props for openTypologyModal, and the recommendations widget\'s props for loadRecommendations. Two pairs are deliberate rather than redundant - profileData is asserted for two different valid codes, because a view permanently returning the OSPW fallback would satisfy an OSPW assertion on its own; and axes is asserted for OSPW and DRNT, which are complements, so both branches of all four ternaries are taken.',
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
    note: 'The search cards pin the third occurrence of FE-DEF-30, whose first two were fixed in the mount order and the address watcher. Despite its name, SearchAutocompleteInput emits `search-submit` from a watcher on every keystroke rather than on submit, so binding it to this page\'s searchQuery re-ran filteredCatalog over whatever was already in memory - the previous term\'s at-most-100 results - and a half-typed search could report "No Formulation Matches" about a product the catalogue holds. The binding is gone, and the card asserts both halves: no request, and no silent narrowing of the grid. Note what this was NOT: mobile search did reach the server, on submit. What bypassed it was the live-typing preview. The two watcher cards are a matched pair - one requires a refetch when the address term changes, the other forbids one for a category change, since category and brand are applied client-side over the same response and only `q` and the price bounds are sent. Neither card alone would catch a guard rewritten to fire always or never.',
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
    note: 'The guest overlay and the popup it opens do not contradict each other - the popup is a condensed restatement of the overlay - so the reported item here was an inconsistency rather than a defect, and is recorded as one. What was wrong: this was the only triggerLoginPopup reason in the codebase phrased as a question, and the question it asked ("Want to know more about this product?") is the one the user had just answered by clicking the overlay that asks it. The six other call sites and the guard\'s own default are all imperative. The safetyChecks card asserts all six labels render rather than only the satisfied ones, because a checklist that hid its failures would read as a clean bill of health.',
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
    file: 'src/__tests__/api/safety.spec.ts',
    feature: '#3 Skincare storage',
    module: 'api/safety',
    prerequisite:
      'Pure decision logic called directly with plain objects. No component mounting and no network access.',
    note: 'Pins FE-DEF-01, FE-DEF-02 and FE-DEF-03 from FRONTEND_DEFECTS.md: three call sites each treated a failed compatibility check as a passed one. blocksAction() must never return false for an unavailable outcome.',
  },
  {
    file: 'src/__tests__/router/guard.spec.ts',
    feature: '#2 Take skinquiz',
    module: 'router/guard',
    prerequisite:
      'No router instance and no components - resolveNavigation is a pure function over the target route and the auth state, called directly with plain objects.',
    note: 'Guards the skin profile page. Without it the page renders a substitute skin type\'s real routine and actives for a user who has never been classified.',
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
