<template>
  <div class="px-5 py-4">
    <div v-if="!device" class="text-center py-8">
      <p class="text-sm text-gray-400">Selecciona un dispositivo</p>
    </div>

    <template v-else-if="device.info">
      <!-- Nombre -->
      <div class="mb-5">
        <h2 class="text-base font-medium text-gray-900">{{ device.info.name }}</h2>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ device.isCxII ? "TI-Nspire CX II" : "TI-Nspire" }} | OS {{ formatVersion(device.info.osVersion) }}
        </p>
      </div>

      <!-- Almacenamiento -->
      <div class="mb-4">
        <div class="flex justify-between text-xs mb-1.5">
          <span class="text-gray-500">Almacenamiento</span>
          <span class="text-gray-400">{{ formatSize(device.info.freeStorage) }} libre</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 rounded-full transition-all"
            :style="{ width: storagePercent + '%' }"
          />
        </div>
      </div>

      <!-- RAM -->
      <div class="mb-4">
        <div class="flex justify-between text-xs mb-1.5">
          <span class="text-gray-500">RAM</span>
          <span class="text-gray-400">{{ formatSize(device.info.freeRam) }} libre</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-emerald-400 rounded-full transition-all"
            :style="{ width: ramPercent + '%' }"
          />
        </div>
      </div>

      <!-- Bateria -->
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-gray-500">Bateria</span>
            <span class="text-gray-400">{{ device.info.battery }}%</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="batteryColor"
              :style="{ width: device.info.battery + '%' }"
            />
          </div>
        </div>
        <span
          v-if="device.info.isCharging"
          class="i-lucide-zap text-amber-400 text-sm"
        />
      </div>
    </template>

    <div v-else-if="device.isLoading" class="flex items-center justify-center py-8">
      <span class="i-lucide-loader-2 text-xl text-blue-500 animate-spin" />
    </div>

    <div v-else-if="device.needsDrivers" class="text-center py-6">
      <span class="i-lucide-alert-triangle text-3xl text-amber-400 mb-3 block" />
      <p class="text-sm text-gray-600 mb-3">Drivers requeridos</p>
      <a
        href="https://lights0123.com/n-link/#windows"
        target="_blank"
        class="text-blue-500 hover:underline text-xs"
      >
        Ver instrucciones
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Device } from "@/types";

const props = defineProps<{
  device: Device | null;
}>();

const storagePercent = computed(() => {
  if (!props.device?.info) return 0;
  const { freeStorage, totalStorage } = props.device.info;
  return ((totalStorage - freeStorage) / totalStorage) * 100;
});

const ramPercent = computed(() => {
  if (!props.device?.info) return 0;
  const { freeRam, totalRam } = props.device.info;
  return ((totalRam - freeRam) / totalRam) * 100;
});

const batteryColor = computed(() => {
  const battery = props.device?.info?.battery ?? 0;
  if (battery > 50) return "bg-green-600";
  if (battery > 20) return "bg-yellow-500";
  return "bg-red-600";
});

function formatVersion(version: string): string {
  return version || "N/A";
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
</script>
