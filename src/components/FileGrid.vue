<template>
  <div
    class="grid gap-1 p-3"
    :style="{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }"
  >
    <div
      v-for="file in files"
      :key="file.path"
      class="flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all select-none"
      :class="{
        'bg-blue-500/10 ring-1 ring-blue-500/30': isSelected(file),
        'hover:bg-gray-50': !isSelected(file),
      }"
      @click="handleClick(file, $event)"
      @dblclick="handleDoubleClick(file)"
    >
      <FileIcon :filename="file.path" :is-dir="file.isDir" class="text-3xl mb-2" />
      <span
        class="text-xs text-center text-gray-700 break-all line-clamp-2"
        :title="file.path"
      >
        {{ file.path }}
      </span>
      <span v-if="!file.isDir" class="text-[10px] text-gray-400 mt-0.5">
        {{ formatSize(file.size) }}
      </span>
    </div>

    <div
      v-if="files.length === 0 && !isLoading"
      class="col-span-full flex flex-col items-center justify-center py-16 text-gray-400"
    >
      <span class="i-lucide-folder-open text-5xl mb-3 opacity-30" />
      <p class="text-sm">Carpeta vacia</p>
    </div>
  </div>
</template>

<script setup lang="ts">

import FileIcon from "./FileIcon.vue";
import type { FileInfo } from "@/types";

const props = defineProps<{
  files: FileInfo[];
  selectedFiles: Set<string>;
  currentPath: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  select: [file: FileInfo];
  toggle: [file: FileInfo];
  open: [file: FileInfo];
}>();

function isSelected(file: FileInfo): boolean {
  return props.selectedFiles.has(`${props.currentPath}/${file.path}`);
}

function handleClick(file: FileInfo, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    emit("toggle", file);
  } else {
    emit("select", file);
  }
}

function handleDoubleClick(file: FileInfo) {
  emit("open", file);
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
</script>
