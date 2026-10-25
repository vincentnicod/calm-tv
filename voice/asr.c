/* cytv-asr: reads 16 kHz signed 16-bit mono PCM from stdin until EOF (at most 30 s) and prints the recognised text.
   Linked against libmoonshine.so from the moonshine-voice package (MIT, https://github.com/moonshine-ai/moonshine);
   the header moonshine-c-api.h comes from the same release. Built by voice/build.sh. */
#include <stdio.h>
#include <stdlib.h>
#include "moonshine-c-api.h"

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: cytv-asr <model dir> < pcm\n"); return 2; }
  size_t cap = 16000 * 30, n = 0, got;
  short *pcm = malloc(cap * sizeof *pcm);
  float *f = malloc(cap * sizeof *f);
  if (!pcm || !f) return 1;
  while (n < cap && (got = fread(pcm + n, sizeof *pcm, cap - n, stdin)) > 0) n += got;
  for (size_t i = 0; i < n; i++) f[i] = pcm[i] / 32768.0f;
  int32_t h = moonshine_load_transcriber_from_files(argv[1], MOONSHINE_MODEL_ARCH_TINY_STREAMING, NULL, 0, MOONSHINE_HEADER_VERSION);
  if (h < 0) { fprintf(stderr, "load failed: %s\n", moonshine_error_to_string(h)); return 1; }
  struct transcript_t *tr = NULL;
  int32_t e = moonshine_transcribe_without_streaming(h, f, n, 16000, 0, &tr);
  if (e != 0) { fprintf(stderr, "transcribe failed: %s\n", moonshine_error_to_string(e)); return 1; }
  for (uint64_t i = 0; i < tr->line_count; i++) printf("%s%s", i ? " " : "", tr->lines[i].text);
  printf("\n");
  moonshine_free_transcriber(h);
  return 0;
}
