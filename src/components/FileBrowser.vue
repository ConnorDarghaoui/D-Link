<template>
  <div class="flex flex-col h-full">
    <FileToolbar
      :current-path="currentPath"
      :breadcrumbs="breadcrumbs"
      :can-go-back="canGoBack"
      :can-go-forward="canGoForward"
      :is-loading="isLoading"
      v-model:show-hidden="showHidden"
      @back="goBack"
      @forward="goForward"
      @up="goUp"
      @refresh="refresh"
      @navigate="navigateTo"
      @new-folder="showNewFolderDialog = true"
      @upload="triggerUpload"
    />

    <!-- Contenido principal -->
    <div class="flex-1 overflow-auto relative">
      <!-- Loader -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-white/90 flex items-center justify-center z-10"
      >
        <span class="i-lucide-loader-2 text-3xl text-blue-500 animate-spin" />
      </div>

      <FileGrid
        :files="sortedFiles"
        :selected-files="selectedFiles"
        :current-path="currentPath"
        :is-loading="isLoading"
        @select="selectFile"
        @toggle="toggleFileSelection"
        @open="openItem"
      />
    </div>

    <!-- Barra de estado -->
    <div class="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
      <span>{{ sortedFiles.length }} elementos</span>
      <span v-if="selectedCount > 0" class="text-blue-500">{{ selectedCount }} seleccionados</span>
    </div>

    <!-- Panel de acciones para seleccion -->
    <Transition name="slide-up">
      <div
        v-if="selectedCount > 0"
        class="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 flex gap-1"
      >
        <button class="btn-icon" title="Descargar" @click="downloadSelected">
          <span class="i-lucide-download text-sm" />
        </button>
        <button class="btn-icon text-red-500 hover:text-red-600 hover:bg-red-50" title="Eliminar" @click="confirmDelete">
          <span class="i-lucide-trash-2 text-sm" />
        </button>
        <button class="btn-icon" title="Limpiar seleccion" @click="clearSelection">
          <span class="i-lucide-x text-sm" />
        </button>
      </div>
    </Transition>

    <!-- Input oculto para upload -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="handleFileUpload"
    />

    <!-- Dialog nueva carpeta -->
    <Teleport to="body">
      <div
        v-if="showNewFolderDialog"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showNewFolderDialog = false"
      >
        <div class="bg-white rounded-xl shadow-2xl p-5 w-72">
          <h3 class="text-base font-medium text-gray-900 mb-4">Nueva carpeta</h3>
          <input
            v-model="newFolderName"
            type="text"
            class="input-field w-full mb-4 text-sm"
            placeholder="Nombre"
            @keyup.enter="createNewFolder"
          />
          <div class="flex justify-end gap-2">
            <button class="btn-secondary text-sm py-1.5" @click="showNewFolderDialog = false">
              Cancelar
            </button>
            <button class="btn-primary text-sm py-1.5" @click="createNewFolder">
              Crear
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Dialog confirmar eliminacion -->
    <Teleport to="body">
      <div
        v-if="showDeleteDialog"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="showDeleteDialog = false"
      >
        <div class="bg-white rounded-xl shadow-2xl p-5 w-80">
          <h3 class="text-base font-medium text-gray-900 mb-2">Eliminar</h3>
          <p class="text-sm text-gray-500 mb-5">
            ¿Eliminar {{ selectedCount }} elemento(s)? Esta accion es irreversible.
          </p>
          <div class="flex justify-end gap-2">
            <button class="btn-secondary text-sm py-1.5" @click="showDeleteDialog = false">
              Cancelar
            </button>
            <button
              class="btn-primary bg-red-500 hover:bg-red-600 text-sm py-1.5"
              @click="executeDelete"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useFileBrowserStore } from "@/stores/fileBrowser";
import { useDevicesStore } from "@/stores/devices";
import { serializeDeviceId } from "@/types";
import FileToolbar from "./FileToolbar.vue";
import FileGrid from "./FileGrid.vue";

const fileBrowser = useFileBrowserStore();
const devicesStore = useDevicesStore();

const {
  currentPath,
  sortedFiles,
  selectedFiles,
  breadcrumbs,
  canGoBack,
  canGoForward,
  isLoading,
  showHidden,
  selectedCount,
} = storeToRefs(fileBrowser);

const {
  navigateTo,
  goBack,
  goForward,
  goUp,
  refresh,
  selectFile,
  toggleFileSelection,
  clearSelection,
  openItem,
  deleteSelected,
  createDirectory,
  uploadFiles,
} = fileBrowser;

// UI State
const showNewFolderDialog = ref(false);
const showDeleteDialog = ref(false);
const newFolderName = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

// Cargar directorio cuando cambia el dispositivo
watch(
  () => devicesStore.selectedDevice,
  (device) => {
    if (device?.info) {
      fileBrowser.reset();
      navigateTo("/");
    }
  },
  { immediate: true }
);

function triggerUpload() {
  fileInput.value?.click();
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    uploadFiles(Array.from(input.files));
    input.value = "";
  }
}

function createNewFolder() {
  if (newFolderName.value.trim()) {
    createDirectory(newFolderName.value.trim());
    newFolderName.value = "";
    showNewFolderDialog.value = false;
  }
}

function downloadSelected() {
  const device = devicesStore.selectedDevice;
  if (!device) return;

  const key = serializeDeviceId(device.id);

  for (const file of fileBrowser.selectedFilesList) {
    const fullPath =
      currentPath.value === "/"
        ? `/${file.path}`
        : `${currentPath.value}/${file.path}`;

    devicesStore.addToQueue(key, {
      type: "download",
      path: fullPath,
      size: file.size,
    });
  }

  clearSelection();
}

function confirmDelete() {
  showDeleteDialog.value = true;
}

function executeDelete() {
  deleteSelected();
  showDeleteDialog.value = false;
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 100%);
}
</style>
