<template>
  <header
    data-tauri-drag-region
    class="h-9 flex items-center justify-between bg-gray-50 border-b border-gray-200 select-none flex-shrink-0"
  >
    <div data-tauri-drag-region class="flex items-center gap-2 px-3 flex-1">
      <span class="i-lucide-link text-blue-500 text-sm" />
      <span class="text-sm font-medium text-gray-700">D-Link</span>
    </div>

    <div class="flex items-center h-full">
      <button
        class="h-full px-4 hover:bg-gray-200 transition-colors text-gray-600"
        title="Minimizar"
        @click="minimizar"
      >
        <span class="i-lucide-minus text-sm" />
      </button>
      <button
        class="h-full px-4 hover:bg-gray-200 transition-colors text-gray-600"
        title="Maximizar"
        @click="maximizar"
      >
        <span :class="estaMaximizada ? 'i-lucide-copy' : 'i-lucide-square'" class="text-sm" />
      </button>
      <button
        class="h-full px-4 hover:bg-red-500 hover:text-white transition-colors text-gray-600"
        title="Cerrar"
        @click="cerrar"
      >
        <span class="i-lucide-x text-sm" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const ventana = getCurrentWindow()
const estaMaximizada = ref(false)

async function minimizar() {
  await ventana.minimize()
}

async function maximizar() {
  await ventana.toggleMaximize()
}

async function cerrar() {
  await ventana.close()
}

async function actualizarEstado() {
  estaMaximizada.value = await ventana.isMaximized()
}

let desuscribir: (() => void) | null = null

onMounted(async () => {
  await actualizarEstado()
  desuscribir = await ventana.onResized(actualizarEstado)
})

onUnmounted(() => {
  desuscribir?.()
})
</script>
