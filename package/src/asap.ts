export function asap (fn: ()=> void) {
  setTimeout(() => fn(), 1)
}
