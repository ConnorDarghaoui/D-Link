<template>
  <div class="border-b border-gray-100">
    <!-- Boton para escanear -->
    <button
      class="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-all"
      @click="handleScan"
    >
      <span class="text-sm font-medium text-gray-700">Dispositivos</span>
      <span
        v-if="isEnumerating"
        class="i-lucide-loader-2 animate-spin text-blue-500"
      />
      <span v-else class="i-lucide-refresh-cw text-gray-400 text-sm" />
    </button>

    <!-- Lista de dispositivos -->
    <div v-if="deviceList.length > 0" class="pb-2">
      <button
        v-for="device in deviceList"
        :key="serializeDeviceId(device.id)"
        class="w-full px-5 py-2.5 flex items-center gap-3 transition-all"
        :class="isSelected(device) 
          ? 'bg-blue-500/5 border-l-2 border-blue-500 text-blue-500' 
          : 'hover:bg-gray-50 text-gray-600'"
        @click="selectDevice(device)"
      >
        <span
          class="i-lucide-calculator"
          :class="device.needsDrivers ? 'text-amber-400' : ''"
        />
        <div class="flex-1 text-left min-w-0">
          <p class="text-sm font-medium truncate" :class="isSelected(device) ? 'text-gray-900' : ''">{{ device.name }}</p>
          <p class="text-xs text-gray-400">
            {{ device.isCxII ? "CX II" : "CX" }}
          </p>
        </div>
        <span
          v-if="device.info"
          class="w-2 h-2 rounded-full bg-green-400"
        />
        <span
          v-else-if="device.isLoading"
          class="i-lucide-loader-2 animate-spin text-blue-500 text-sm"
        />
      </button>
    </div>

    <!-- Estado vacio -->
    <div
      v-else-if="hasEnumerated"
      class="px-5 py-6 text-center"
    >
      <p class="text-sm text-gray-400">Sin dispositivos</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useDevicesStore } from "@/stores/devices";
import { serializeDeviceId } from "@/types";
import type { Device } from "@/types";

const devicesStore = useDevicesStore();

const { deviceList, selectedDeviceKey, isEnumerating, hasEnumerated } =
  storeToRefs(devicesStore);

function isSelected(device: Device): boolean {
  return serializeDeviceId(device.id) === selectedDeviceKey.value;
}

async function handleScan() {
  await devicesStore.enumerate();
}

async function selectDevice(device: Device) {
  const key = serializeDeviceId(device.id);
  devicesStore.selectDevice(key);

  // Abrir automaticamente si no esta abierto
  if (!device.info && !device.isLoading && !device.needsDrivers) {
    try {
      await devicesStore.openDevice(key);
    } catch (e) {
      console.error("Error al abrir dispositivo:", e);
    }
  }
}
</script>
