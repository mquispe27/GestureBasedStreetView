<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

const currentRoute = useRoute();
const currentRouteName = computed(() => currentRoute.name);
</script>

<template>
  <header>
    <nav>
      <div class="title">
        <img src="@/assets/images/logo.svg" />
        <RouterLink :to="{ name: 'Home' }">
          <h1>Gesture Based Street View</h1>
        </RouterLink>
      </div>
      <ul>
        <li>
          <RouterLink :to="{ name: 'Home' }" :class="{ underline: currentRouteName == 'Home' }"> Home </RouterLink>
        </li>
      </ul>
    </nav>
  </header>
  <RouterView />
</template>

<style scoped>
@import "./assets/toast.css";
nav {
  padding: 1em 2em;
  background: linear-gradient(90deg, #1e2230, #2a2f40);
  display: flex;
  align-items: center;
  border-bottom: 1px solid #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

h1 {
  font-size: 1.5rem;
  margin: 0;
  color: #e0e6ff;
  transition: color 0.3s ease;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.75em;
}

img {
  height: 2.2em;
  filter: brightness(1.2);
}

ul {
  list-style-type: none;
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 1.2em;
}

a {
  font-size: 1rem;
  color: #c8d1f5;
  text-decoration: none;
  position: relative;
  padding-bottom: 4px;
  transition: color 0.3s ease;
}

a:hover {
  color: #ffffff;
}

a::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 100%;
  background-color: #4a90e2;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s ease-out;
}

a:hover::after,
.underline::after {
  transform: scaleX(1);
}

.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #323748;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  font-size: 14px;
  z-index: 3000;
}
</style>
