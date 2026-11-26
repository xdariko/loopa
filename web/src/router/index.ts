import { createRouter, createWebHistory } from 'vue-router'

import { getAccount } from '@/api/account'
import { useAccountStore } from '@/stores/account'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
    },
    {
      path: '/projects',
      name: 'projects',
      meta: { requiresAccount: true },
      component: () => import('@/views/ProjectsView.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
    },
    {
      path: '/s/:token',
      name: 'shared',
      component: () => import('@/views/SharedView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAccount) {
    return
  }

  const account = useAccountStore()
  try {
    account.email = (await getAccount()).email
  } catch {
    account.email = null
  }
  if (!account.email) {
    return { name: 'account', replace: true }
  }
})

export default router
