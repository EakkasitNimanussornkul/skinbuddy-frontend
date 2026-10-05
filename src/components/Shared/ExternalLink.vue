<script setup lang="ts">
import { computed } from 'vue'
import { LINK_REL, linkHost, safeHref, type LinkKind } from '../../utils/safeLinks'

/**
 * An external link, made one way everywhere (utils/safeLinks): a link only for
 * an http or https address, opening in a new tab, with the rel for who
 * supplied it - "user" (the default) for anything a person outside the team
 * sent, "curated" for a source the team attached. Any other value renders the
 * #fallback slot instead, which the caller words as plain text, or nothing.
 *
 * With show-host the real host comes first in bold and the full address after
 * it in smaller text, so an admin checking a link sees "brand-example.co"
 * rather than reading past it in a long address.
 *
 * Attributes (the class, for one) go on the link, not on the fallback.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    url: string | null | undefined
    kind?: LinkKind
    showHost?: boolean
  }>(),
  { kind: 'user', showHost: false },
)

const href = computed(() => safeHref(props.url))
const host = computed(() => (props.showHost ? linkHost(props.url) : null))
</script>

<template>
  <a v-if="href" v-bind="$attrs" :href="href" target="_blank" :rel="LINK_REL[kind]">
    <template v-if="host">
      <strong class="link-host block text-sm font-extrabold text-stone-800 dark:text-white">{{ host }}</strong>
      <span class="link-address block text-xs font-normal text-stone-500 dark:text-stone-400 underline break-all"><slot>{{ url }}</slot></span>
    </template>
    <slot v-else>{{ url }}</slot>
  </a>
  <slot v-else name="fallback" />
</template>
