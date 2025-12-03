<template>
  <div v-if="queue.length > 0" class="border-t border-gray-100 px-5 py-3">
    <h3 class="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
      Cola
    </h3>

    <div class="space-y-1.5 max-h-32 overflow-auto">
      <div
        v-for="(item, index) in queue"
        :key="item.id"
        class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs"
      >
        <!-- Icono de accion -->
        <span :class="getActionIcon(item.action.type)" class="text-sm" />

        <!-- Descripcion -->
        <div class="flex-1 min-w-0">
          <p class="truncate text-gray-600">{{ getActionLabel(item.action) }}</p>
          <div v-if="index === 0 && item.progress" class="mt-1.5">
            <div class="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 transition-all"
                :style="{ width: progressPercent(item) + '%' }"
              />
            </div>
          </div>
        </div>

        <!-- Estado -->
        <span
          v-if="index === 0"
          class="i-lucide-loader-2 animate-spin text-blue-500 flex-shrink-0 text-sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { QueueItem, QueueAction } from "@/types";

defineProps<{
  queue: QueueItem[];
}>();

function getActionIcon(type: QueueAction["type"]): string {
  const icons: Record<QueueAction["type"], string> = {
    download: "i-lucide-download text-blue-500",
    upload: "i-lucide-upload text-emerald-500",
    uploadOs: "i-lucide-hard-drive text-violet-500",
    delete: "i-lucide-trash-2 text-red-400",
    createDir: "i-lucide-folder-plus text-amber-500",
    move: "i-lucide-move text-orange-500",
    copy: "i-lucide-copy text-cyan-500",
  };
  return icons[type];
}

function getActionLabel(action: QueueAction): string {
  switch (action.type) {
    case "download":
      return `Descargando ${action.path.split("/").pop()}`;
    case "upload":
      return `Subiendo ${action.file.name}`;
    case "uploadOs":
      return `Actualizando OS: ${action.file.name}`;
    case "delete":
      return `Eliminando ${action.path.split("/").pop()}`;
    case "createDir":
      return `Creando carpeta ${action.path.split("/").pop()}`;
    case "move":
      return `Moviendo a ${action.dest}`;
    case "copy":
      return `Copiando a ${action.dest}`;
  }
}

function progressPercent(item: QueueItem): number {
  if (!item.progress || item.progress.total === 0) return 0;
  return (item.progress.current / item.progress.total) * 100;
}
</script>
