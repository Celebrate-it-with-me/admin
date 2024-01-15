<script setup lang="ts">
import { ref, watch } from 'vue'
const emit = defineEmits(['newInput'])
const props = defineProps({
  placeholder: {
    type: String,
    required: false,
    default: 'Search'
  }
})
const timeOut = ref(0)
const search = ref('')

const updateSearch = () => {
  emit('newInput', search.value)
}

watch(search, (newSearch, oldSearch) => {
  // Making a delay for typing
  clearTimeout(timeOut)
  setTimeout(updateSearch, 800)
})

</script>

<template>
  <v-text-field :placeholder="props.placeholder" v-model="search"></v-text-field>
</template>

<style scoped>

</style>
