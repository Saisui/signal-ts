# signal-ts
a signal.ts lib

compile it

```
npx civet -c store.civet -o store.ts

npx tsc
```
## USAGE

for `unwrappable` i.e. `number`, `string`, `boolean`, `null | undefined`, `Function`
it use `ref`
for `wrappable` i.e. `object`, `array` or `Map`(maybe supports later)
it use `createStore`

for Array:

### Array

use for LitElement

```tsx

// make
<ul id="user-list">
</ul>
// to
<ul id="user-list">
    <li>Alice</li>
    <li>Bob</li>
    <li>Carol</li>
</ul>

// make a store, first, need a Empty Array, for pushed-trigger
let store = new StoreArray([]);
let userListElem = document.getElementById('user-list');

store.bind({
    // Handle item addition
    push(item, idx) {
        let userElem = new MyUserElement(item);
        userListElem.appendChild(userElem);
    },
    // Handle item updates
    set(idx, newVal, oldVal) {
        let userElem = userListElem.children[idx];
        userElem.innerText = newVal;
    },
    // Handle item deletions
    delete(idx, oldVal) {
        let userElem = userListElem.children[idx];
        userElem.remove();
    },
   // Handle item reordering
    rotate(curIdx, oldIdx, item) {
        let userElem = userListElem.children[oldIdx];
        userListElem.appendChild(userElem, userListElem.children[curIdx]);
    },
});

let people = ["Alice", "Bob", "Carol"]
// push them...
store.push(...people);
<ul id="user-list">
    <li>Alice</li>
    <li>Bob</li>
    <li>Carol</li>
</ul>
store.set(1, "Bobby");
<ul id="user-list">
    <li>Alice</li>
    <li>Bobby</li>
    <li>Carol</li>
</ul>
store.delete(0);
<ul id="user-list">
    <li>Bobby</li>
    <li>Carol</li>
</ul>
store.rotate(1);
<ul id="user-list">
    <li>Carol</li>
    <li>Bobby</li>
</ul>

```
