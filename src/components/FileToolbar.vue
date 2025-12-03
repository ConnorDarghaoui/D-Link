<template>
  <div class="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
    <!-- Navegacion -->
    <button
      class="btn-icon"
      :disabled="!canGoBack"
      title="Atras"
      @click="$emit('back')"
    >
      <span class="i-lucide-arrow-left text-sm" />
    </button>
    <button
      class="btn-icon"
      :disabled="!canGoForward"
      title="Adelante"
      @click="$emit('forward')"
    >
      <span class="i-lucide-arrow-right text-sm" />
    </button>
    <button
      class="btn-icon"
      :disabled="currentPath === '/'"
      title="Subir"
      @click="$emit('up')"
    >
      <span class="i-lucide-arrow-up text-sm" />
    </button>

    <!-- Breadcrumbs -->
    <nav class="flex items-center gap-1 flex-1 min-w-0 ml-2">
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
        <button
          class="text-sm hover:text-blue-500 transition-colors truncate max-w-32"
          :class="index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-400'"
          @click="$emit('navigate', crumb.path)"
        >
          {{ crumb.name }}
        </button>
        <span
          v-if="index < breadcrumbs.length - 1"
          class="text-gray-300 text-xs">/</span>
      </template>
    </nav>

    <!-- Acciones -->
    <button class="btn-icon" title="Refrescar" @click="$emit('refresh')">
      <span class="i-lucide-refresh-cw text-sm" :class="{ 'animate-spin': isLoading }" />
    </button>
    <button class="btn-icon" title="Nueva carpeta" @click="$emit('newFolder')">
      <span class="i-lucide-folder-plus text-sm" />
    </button>
    <button class="btn-icon" title="Subir archivos" @click="$emit('upload')">
      <span class="i-lucide-upload text-sm" />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentPath: string;
  breadcrumbs: { name: string; path: string }[];
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  showHidden: boolean;
}>();

defineEmits<{
  back: [];
  forward: [];
  up: [];
  refresh: [];
  navigate: [path: string];
  newFolder: [];
  upload: [];
  "update:showHidden": [value: boolean];
}>();
</script>
