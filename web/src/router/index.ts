import { createRouter, createWebHistory } from 'vue-router'

import EditorView from '@/views/EditorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'editor',
      component: EditorView,
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('@/views/ProjectsView.vue'),
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

export default router
