<template>
  <div class="home">
    <section class="home__hero" aria-labelledby="home-title">
      <div class="home__intro">
        <h1 id="home-title">
          Собери
          <span class="home__heading-accent">свой луп
            <span class="home__mark" aria-hidden="true"></span>
          </span>
        </h1>
        <p>
          Loopa — музыкальный секвенсор в браузере.
          <span
            >Расставляй ноты на сетке, добавляй свои звуки и собирай композицию из паттернов.</span
          >
        </p>
        <div class="home__actions">
          <RouterLink :to="{ name: 'editor' }" class="home__button home__button--primary">
            Открыть редактор
          </RouterLink>
          <RouterLink :to="{ name: 'account' }" class="home__button">
            Войти или зарегистрироваться
          </RouterLink>
        </div>
      </div>
      <div class="home__demo">
        <div class="home__preview" aria-hidden="true">
          <div class="home__ruler">
            <span v-for="beat in 4" :key="beat">{{ beat }}</span>
          </div>
          <div class="home__instrument">
            <div class="home__keys">
              <span
                v-for="pitch in pitches"
                :key="pitch"
                :class="{ 'home__key--sharp': pitch.includes('#') }"
              >
                {{ pitch }}
              </span>
            </div>
            <div class="home__roll">
              <span
                v-for="([row, start, length], index) in notes"
                :key="index"
                class="home__note"
                :style="{
                  gridRow: row,
                  gridColumn: `${start} / span ${length}`,
                  '--note-start': `${(start - 1) * 250}ms`,
                }"
              />
              <span class="home__playhead" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const pitches = ['E4', 'D#4', 'D4', 'C#4', 'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3']

const notes = [
  [6, 1, 3],
  [4, 4, 2],
  [3, 6, 3],
  [5, 9, 2],
  [2, 11, 2],
  [3, 13, 4],
  [9, 1, 4],
  [8, 5, 4],
  [7, 9, 4],
  [8, 13, 4],
] as const
</script>
