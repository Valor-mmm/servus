<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="flex min-h-screen items-center justify-center">
    <h1 class="text-4xl font-bold">{{ t('app.name') }}</h1>
  </main>
</template>
