<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div ref="root" class="relative h-full w-full bg-gray-900">
    <div
      class="relative h-full flex overflow-hidden bg-black"
      @pointermove="idleCheck"
      @pointerleave="idle = true"
      @dragover.prevent
      @drop.prevent="dropFile"
    >
      <div
        ref="videoContainer"
        class="relative flex flex-1 flex-shrink items-center justify-center"
        :class="videoClasses"
      >
        <div class="aspect-video max-h-full max-w-full overflow-hidden">
          <video
            ref="video"
            class="pointer-events-none origin-left-top transform-gpu"
            :style="videoStyles"
          />
        </div>
        <div
          class="absolute bottom-0 left-0 h-12 w-full flex items-center from-gray-800/70 to-transparent bg-gradient-to-t p-2 text-white transition-opacity space-x-4"
          :class="{
            'opacity-0 pointer-events-none': idle,
            'opacity-100': !idle,
          }"
          @pointermove="idleCheck"
        >
          <span
            class="aspect-square h-full w-initial cursor-pointer"
            :class="{
              'i-ri-play-fill': !playing,
              'i-ri-pause-fill': playing,
            }"
            @click="playing = !playing"
          />
          <span
            class="aspect-square h-full w-initial"
            :class="{
              'i-ri-volume-up-fill': +volume > 0,
              'i-ri-volume-mute-fill': +volume === 0,
            }"
          />
          <input
            id="volume"
            v-model="volume"
            class="w-26"
            type="range"
            name="volume"
            min="0"
            max="100"
          />
          <div class="flex-1" />
          <span
            class="i-ri-vidicon-fill aspect-square h-full w-initial cursor-pointer"
            @click="sideMenuOpen = !sideMenuOpen"
          />
          <span
            class="aspect-square h-full w-initial cursor-pointer"
            :class="{
              'i-ri-fullscreen-fill': !isFullscreen,
              'i-ri-fullscreen-exit-fill': isFullscreen,
            }"
            @click="toggle"
          />
        </div>
      </div>
      <div
        class="h-full flex-shrink-0 from-black to-gray-900 bg-gradient-to-l"
        :class="{ 'w-15%': sideMenuOpen, 'w-0': !sideMenuOpen }"
      >
        <div
          ref="sideMenu"
          class="grid grid-rows-5 h-full w-15% w-full items-center justify-center p-2 text-white"
        >
          <div class="relative aspect-video cursor-pointer" :class="canvasClasses">
            <canvas
              ref="c1"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === 1 }"
              @click="angle = 1"
            />
          </div>
          <div class="relative aspect-video cursor-pointer" :class="canvasClasses">
            <canvas
              ref="c2"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === 2 }"
              @click="angle = 2"
            />
          </div>
          <div class="relative aspect-video cursor-pointer" :class="canvasClasses">
            <canvas
              ref="c3"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === 3 }"
              @click="angle = 3"
            />
          </div>
          <div class="relative aspect-video cursor-pointer" :class="canvasClasses">
            <canvas
              ref="c4"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === 4 }"
              @click="angle = 4"
            />
          </div>
          <div class="relative aspect-video cursor-pointer" :class="canvasClasses">
            <canvas
              ref="c5"
              class="h-full w-full border-2 border-gray-700 rounded-2"
              :class="{ 'border-yellow': angle === 5 }"
              @click="angle = 5"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const root = ref<HTMLElement>();
const video = ref<HTMLVideoElement>();
const videoContainer = ref<HTMLElement>();
const c1 = ref<HTMLCanvasElement>();
const c2 = ref<HTMLCanvasElement>();
const c3 = ref<HTMLCanvasElement>();
const c4 = ref<HTMLCanvasElement>();
const c5 = ref<HTMLCanvasElement>();
const sideMenu = ref<HTMLElement>();

const vcSize = useElementSize(videoContainer);
const sideMenuSize = useElementSize(sideMenu);
const { playing } = useMediaControls(video);
const { isFullscreen, toggle } = useFullscreen(root);

const presets = [
  [0, 0, 1920, 1080],
  [1920, 0, 1920, 1080],
  [0, 1080, 1920, 1080],
  [1920, 1080, 1920, 1080],
  [0, 0, 3840, 2160],
];

const videoStyles = computed(() => {
  if (!video.value) return '';
  const { videoHeight, videoWidth } = video.value;
  const [x, y, w, h] = presets[angle.value - 1];
  if (videoHeight === h && videoWidth === w) return '';
  const scale = videoHeight / h;
  const posX = x / (videoWidth || 1);
  const posY = y / (videoHeight || 1);

  return `
    --un-scale-x: ${scale || 1};
    --un-scale-y: ${scale || 1};
    --un-translate-x: ${-posX * scale * 100}%;
    --un-translate-y: ${-posY * scale * 100}%;`;
});

const idle = ref(true);
const volume = useLocalStorage('volume', '50');
const angle = ref(5);
const sideMenuOpen = ref(false);

const idleTimeout = useTimeoutFn(
  () => {
    idle.value = true;
  },
  2000,
  { immediate: false }
);

const WIDESCREEN_RATIO = 16 / 9;
const videoClasses = computed(() => {
  const ratio = vcSize.width.value / vcSize.height.value;
  return ratio > WIDESCREEN_RATIO ? 'w-initial' : 'w-full';
});
const canvasClasses = computed(() => {
  const ratio = sideMenuSize.width.value / (sideMenuSize.height.value / 5);
  return ratio >= WIDESCREEN_RATIO ? 'w-initial' : 'w-full';
});

const idleCheck = () => {
  idle.value = false;
  idleTimeout.start();
};

const dropFile = (ev: DragEvent) => {
  ev.stopPropagation();
  if (video.value?.src) URL.revokeObjectURL(video.value.src);
  if (ev.dataTransfer?.items?.length) {
    [...ev.dataTransfer.items].some((item) => {
      if (item.kind !== 'file') return false;
      const file = item.getAsFile();
      if (file?.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        return true;
      }
    });
  } else if (ev.dataTransfer?.files?.length) {
    [...ev.dataTransfer.files].some((file) => {
      if (file.type.startsWith('video')) {
        video.value!.src = URL.createObjectURL(file);
        return true;
      }
    });
  }
};

const drawCameras = () => {
  if (!playing.value) return;
  if (!sideMenuOpen.value) return;
  [c1, c2, c3, c4, c5].forEach((c, i) => {
    const ctx = c.value!.getContext('2d');
    if (!ctx) return;
    const [x, y, w, h] = presets[i];
    const { width, height } = c.value!.getBoundingClientRect();
    c.value!.width = width;
    c.value!.height = height;
    ctx.drawImage(video.value!, x, y, w, h, 0, 0, width, height);
  });
};

onMounted(() => {
  if (!video.value) return;
  video.value.volume = +volume.value / 100;
  video.value.addEventListener('loadedmetadata', () => {
    video.value!.play();
    angle.value = 1;
    if (video.value?.requestVideoFrameCallback) {
      const cb = () => {
        drawCameras();
        video.value!.requestVideoFrameCallback(cb);
      };
      video.value!.requestVideoFrameCallback(cb);
    } else {
      const cb = () => {
        drawCameras();
        requestAnimationFrame(cb);
      };
      requestAnimationFrame(cb);
    }
  });
});
</script>

<style lang="scss" scoped>
.cam-label {
  @apply absolute left-1 top-0 font-700;
  text-shadow: #fff 1px 0 10px;
}
</style>

<style lang="scss">
#volume {
  @apply cursor-pointer appearance-none;
  &::-webkit-slider-runnable-track {
    @apply bg-current h-1;
  }
  &::-moz-range-track {
    @apply bg-current h-1;
  }
  &::-webkit-slider-thumb {
    @apply appearance-none bg-current w-3 h-3 -mt-1 rounded-full;
  }
}
</style>
