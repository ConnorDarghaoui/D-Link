<template>
  <span :class="iconClass" />
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  filename: string;
  isDir: boolean;
}>();

const iconClass = computed(() => {
  if (props.isDir) {
    return "i-lucide-folder text-yellow-500";
  }

  const ext = props.filename.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, string> = {
    tns: "i-lucide-file-text text-blue-600",
    tnsp: "i-lucide-file-code text-purple-600",
    tno: "i-lucide-file-cog text-orange-600",
    tne: "i-lucide-file-archive text-green-600",
    tcc: "i-lucide-file-code-2 text-cyan-600",
    pdf: "i-lucide-file-text text-red-600",
    txt: "i-lucide-file-text text-gray-600",
    lua: "i-lucide-file-code text-indigo-600",
    py: "i-lucide-file-code text-green-700",
    jpg: "i-lucide-image text-pink-500",
    jpeg: "i-lucide-image text-pink-500",
    png: "i-lucide-image text-pink-500",
    bmp: "i-lucide-image text-pink-500",
  };

  return iconMap[ext] ?? "i-lucide-file text-gray-400";
});
</script>
