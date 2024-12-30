<script setup lang="ts">
import {ref} from "vue";
import ThreeDotsLoader from "./icons/ThreeDotsLoader.vue";

const statuses = ref<string[]>([]);
const loading = ref(false);
const username = ref<string>("");
const password = ref<string>("");

const initializeProcess = async () => {
  loading.value = true;
  statuses.value = []; // Clear previous statuses
  statuses.value.push("Initializing house lottery process...");

  try {
    const formData = new FormData();
    formData.append("username", username.value);
    formData.append("password", password.value);
    const response = await fetch('/api/join-lottery', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      statuses.value.push(...data.statuses);
      statuses.value.push("Process completed successfully.");
    } else {
      statuses.value.push(...data.statuses);
      statuses.value.push(`Process failed: ${data.error}`);
    }
  } catch (error: any) {
    statuses.value.push(`Unexpected error: ${error.message}`);
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <form @submit.prevent="initializeProcess">
    <div class="grid grid-cols-2 gap-x-4 items-center">
      <div><label for="username">Username</label>
        <input type="email"
               id="username"
               name="username"
               required
               v-model="username"
               class="w-full text-base h-12 bg-neutral-900 text-white p-3 rounded-xl lg:rounded-lg border border-neutral-800 focus:outline-none focus:ring-0 focus:border-neutral-700 focus-visible:border-neutral-700 placeholder:text-neutral-400 placeholder:font-normal placeholder:text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
        />
      </div>
      <div>
        <label for="username">Password</label>
        <input type="password"
               id="username"
               name="username"
               required
               v-model="password"
               class="w-full text-base h-12 bg-neutral-900 text-white p-3 rounded-xl lg:rounded-lg border border-neutral-800 focus:outline-none focus:ring-0 focus:border-neutral-700 focus-visible:border-neutral-700 placeholder:text-neutral-400 placeholder:font-normal placeholder:text-sm disabled:bg-neutral-100 disabled:text-neutral-500"
        />
      </div>
    </div>
    <button type="submit"
            class="bg-neutral-900 text-lg h-12 text-white p-2 rounded-xl w-full justify-center flex gap-x-2 items-center mt-6">
      Initialize
      <ThreeDotsLoader v-if="loading" class="w-4 h-4"/>
    </button>
    <transition-group
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 tranneutral-y-1"
        enter-to-class="opacity-100 tranneutral-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 tranneutral-y-0"
        leave-to-class="opacity-0 tranneutral-y-1"
    >
      <div v-for="(status, index) in statuses"
           :key="index"
           class="text-white my-2 p-2 rounded"
           v-html="status">
      </div>
    </transition-group>
  </form>
</template>