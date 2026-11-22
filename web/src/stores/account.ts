import { defineStore } from 'pinia'

export const useAccountStore = defineStore('account', {
  state() {
    return {
      email: null as string | null,
    }
  },
})
