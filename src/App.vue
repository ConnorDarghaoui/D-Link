<template>
  <div class="h-screen flex bg-gray-50/50">
    <!-- Sidebar izquierdo -->
    <aside class="w-64 flex flex-col bg-white border-r border-gray-100 flex-shrink-0">
      <header class="px-5 py-4">
        <h1 class="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <span class="i-lucide-link text-blue-500" />
          D-Link
        </h1>
      </header>

      <DeviceSelector />

      <div class="flex-1 overflow-auto">
        <DeviceInfo :device="selectedDevice" />
      </div>

      <OperationQueue :queue="selectedDeviceQueue" />

      <footer class="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
        <p>D-Link - Lucas Boniche</p>
        <p class="mt-0.5">
          Basado en
          <a
            href="https://lights0123.com/n-link/"
            target="_blank"
            class="text-blue-500 hover:underline"
          >N-Link</a>
        </p>
      </footer>
    </aside>

    <!-- Contenido principal -->
    <main class="flex-1 flex flex-col min-w-0 bg-white m-2 rounded-xl border border-gray-100 overflow-hidden">
      <template v-if="selectedDevice?.info">
        <FileBrowser />
      </template>

      <template v-else-if="selectedDevice?.needsDrivers">
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center p-8">
            <span class="i-lucide-alert-triangle text-5xl text-amber-400 mb-4 block" />
            <h2 class="text-xl font-medium text-gray-900 mb-2">Drivers requeridos</h2>
            <p class="text-gray-500 mb-6 max-w-sm">
              Se necesita instalar el driver WinUSB para comunicarse con este dispositivo.
            </p>
            <a
              href="https://lights0123.com/n-link/#windows"
              target="_blank"
              class="btn-primary inline-flex items-center gap-2"
            >
              Ver instrucciones
              <span class="i-lucide-external-link text-sm" />
            </a>
          </div>
        </div>
      </template>

      <template v-else-if="selectedDevice?.isLoading">
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <span class="i-lucide-loader-2 text-5xl text-blue-500 animate-spin mb-4 block" />
            <p class="text-gray-500">Conectando...</p>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center p-8">
            <span class="i-lucide-calculator text-6xl text-gray-200 mb-6 block" />
            <h2 class="text-xl font-medium text-gray-900 mb-2">
              Bienvenido a D-Link
            </h2>
            <p class="text-gray-500 mb-8 max-w-sm">
              Conecta tu calculadora TI-Nspire por USB para comenzar.
            </p>
            <button class="btn-primary" @click="enumerate">
              <span class="i-lucide-scan mr-2" />
              Buscar dispositivos
            </button>
          </div>
        </div>
      </template>
    </main>

    <!-- Modal de error -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="lastError"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          @click.self="clearError"
        >
          <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div class="flex items-start gap-4">
              <span class="i-lucide-alert-circle text-2xl text-red-500 flex-shrink-0" />
              <div>
                <h3 class="font-medium text-gray-900">Error</h3>
                <p class="text-gray-500 mt-1 text-sm">{{ lastError.message }}</p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button class="btn-primary" @click="clearError">Cerrar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useDevicesStore } from "@/stores/devices";
import { DeviceSelector, DeviceInfo, FileBrowser, OperationQueue } from "@/components";

const devicesStore = useDevicesStore();

const { selectedDevice, selectedDeviceQueue, lastError } = storeToRefs(devicesStore);
const { enumerate, initEventListeners } = devicesStore;

function clearError() {
  devicesStore.lastError = null;
}

onMounted(async () => {
  await initEventListeners();
  await enumerate();
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
