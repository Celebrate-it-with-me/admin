import { ref, type Ref } from 'vue'

/** Loads one card: keeps the previous data while reloading (dimmed by the card), and flags a failure without losing it. */
export function useLoader<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)
  const failed = ref(false)
  const loadedAt = ref<Date | null>(null)
  let latest = 0

  const load = async () => {
    const request = ++latest
    loading.value = true
    failed.value = false
    try {
      const result = await fetcher()
      if (request !== latest) return
      data.value = result
      loadedAt.value = new Date()
    } catch {
      if (request === latest) failed.value = true
    } finally {
      if (request === latest) loading.value = false
    }
  }
  return { data, loading, failed, loadedAt, load }
}
