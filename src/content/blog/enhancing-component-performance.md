---
title: 'Enhancing component performance in javaScript frontend frameworks'
description: ''
pubDate: 'Aug 21 2023'
editDate: 'Mar 09 2024'
heroImage: '/js-frameworks.jpg'
---

Welcome to an in-depth exploration of component performance within the realm of JavaScript frontend frameworks. In this article, we will navigate through crucial aspects that significantly impact component performance, such as rendering optimizations, virtual DOM implementations, state management strategies, and the intricacies of reactive data flows. By delving into these components' behaviors and underlying mechanisms, we aim to empower developers with insights and techniques that will elevate the performance metrics of their applications.

## Clarifying key concepts

Before we dive into the specifics, let's ensure we have a clear understanding of some fundamental terms:

- **Re-rendering:**
  _Re-rendering_ occurs when a component's view updates to reflect changes in data without recreating the component entirely. During re-rendering, the component's template is re-evaluated, and the updated virtual representation is compared to the previous one, resulting in minimal changes to the real DOM.

- **Updates:**
  An "_update_" refers to changes in the application's state or data. These changes trigger a re-render of the component (or the DOM element for fine-grained reactivity) to reflect the updated data.

- **Mounting/unmounting/re-mounting:**
  "_Mounting_" involves creating a new component instance and inserting it into the DOM for the first time. Conversely, "_unmounting_" is the process of removing a component from the DOM and releasing any associated resources. "_Re-mounting_" occurs when a component is unmounted and then mounted again, effectively recreating the component instance and initiating the mounting process anew.

## React: a closer look at rerenders

In the realm of React, the Virtual DOM serves as an abstraction layer over the actual DOM. Instead of directly modifying the DOM, React creates a virtual representation of the changes in memory. This optimization process allows React to batch updates and minimize direct DOM manipulations, thus enhancing performance.

Reconciliation, the heart of React's Virtual DOM, determines how changes are applied to the DOM. This process ensures that components are updated efficiently, with only the necessary parts of the DOM being updated.

Components in React re-render under specific circumstances:

- When the component's state changes
- When a parent component undergoes a re-render
- When there are changes in context values

Interestingly, it's important to note that changes in props do not trigger child re-renders. Instead, React components re-render based on state changes, which can sometimes lead to suboptimal performance and a somewhat laggy user experience.

## Optimizing React rerenders

### I. Composition techniques

A pivotal strategy for optimizing React rerenders involves effective component composition:

1. **Moving state down:**
   By confining state updates to components lower in the component tree, you minimize the number of rerenders. Isolating state changes to components with fewer children results in more efficient updates.

2. **Components as children props:**
   Introducing "children props" allows you to update state within components that have DOM children. This strategy separates unrelated state updates, preventing them from affecting each other and their respective children.

3. **Components as props:**
   Akin to the previous technique, this approach utilizes other props (beyond children props) to optimize state updates and rerenders.

### II. Leveraging memoization

When composition isn't feasible, memoization can be a game-changer:

- In functional components, wrapping a child component in `React.memo` prevents unnecessary rerenders.
- For class components, inheriting from `PureComponent` or using custom comparison functions alongside memoization mechanisms prevents unnecessary rerenders.

However, it's crucial to use memoization judiciously to avoid unnecessary overhead.

It must be note that, while react is becoming one of the hardest framework to optimize, it's backbone is not planned to be updated by the team (unlike the next framework of this list).

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">We might add a signals-like primitive to React but I don’t think it’s a great way to write UI code. It’s great for performance. But I prefer React’s model where you pretend the whole thing is recreated every time. Our plan is to use a compiler to achieve comparable performance.</p>&mdash; Andrew Clark (@acdlite) <a href="https://twitter.com/acdlite/status/1626590880126889984?ref_src=twsrc%5Etfw">February 17, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

However there have been some work for quite a while for a compiler automating all the memoization when possible, called **react forget**, but no date to the horizon (it's actually been while since we haven't got any news, maybe _react forgot..._)

---

_**EDIT:** Turns out React hasn't forgot, new compilation mode is being tried by meta. This will help getting rid of useMemo, useCallbacks, and everything related, by doing automated memoisation at compilation._

---

### React store management libraries

1. **Redux:**
   Redux provides a global store that holds the state of the application. Components connected to the Redux store automatically subscribe to changes in the state. When the state changes, Redux notifies the connected components, causing them to re-render. By using `connect` or `useSelector`, you can define a `mapStateToProps` function that selects specific parts of the state that a component needs. This can help avoid unnecessary re-renders when other parts of the state change.

2. **Zustand:**
   Zustand's hook-based API allows components to select the specific parts of the state they are interested in. This selective subscription to state updates helps optimize re-renders, as components only re-render when the relevant parts of the state change. By only subscribing to the state you need in a given component, you can achieve minimal re-renders.

3. **Jotai:**
   Components that use the `useAtom` hook in Jotai only re-render when the state of the atoms they access changes. This selective subscription to state updates helps optimize re-renders, as components react only to relevant changes.

4. **Nanostores:**
   Components subscribed to specific atoms in Nanostores re-render only when the corresponding atom's state changes. This selective reactivity minimizes unnecessary re-renders in components that don't depend on specific changes. Nanostores give the advantage to be shareable between many different JS frameworks, it maybe useful if you plan on using Astro with many frameworks for example.

## Angular's approach to component updates

Angular, like React, adopts the concept of a virtual DOM, but it implements it uniquely. Angular employs a two-phase change detection mechanism that efficiently detects and applies changes to the DOM. Unlike React's virtual DOM diffing, Angular focuses on individual components affected by changes instead of diffing entire virtual DOM trees.

Angular's change detection comes in two flavors: the default "_CheckAlways_" strategy and the more efficient "_OnPush_" strategy. The former triggers rerenders whenever any changes occur, whereas the latter focuses on input property changes and event triggers. Change detection might change with the recent introduction of **signals**, that should make _zone.js_ no longer useful in angular.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Today we are excited to open the first PR of our exploration into fine-grained reactivity! 🚦<br><br>This is the foundation to allow prototyping &amp; amplify the value of an upcoming RFC on our plans to introduce a new reactive primitive into Angular.<br><br>Read more: <a href="https://t.co/juKz9phIFP">https://t.co/juKz9phIFP</a></p>&mdash; Angular (@angular) <a href="https://twitter.com/angular/status/1625939902046117890?ref_src=twsrc%5Etfw">February 15, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

---

_**EDIT:** Signals are now realeased and production ready. Let's see what happens to Zone.js in Angular!_

---

### Store management in angular

In Angular, components can be seamlessly connected to services, which can act as centralized state management solutions (stores). When state changes occur and the store emits new values through RxJs observables (or subjects, behaviourSubjects, ...), subscribed components re-render to reflect the updated data. To optimize performance, it's recommended to use the "OnPush" change detection strategy and consider the specific parts of the state required by a component. This selective subscription helps prevent unnecessary re-renders when unrelated parts of the state change.

## Vue's vue on component updates

Vue.js also embraces the Virtual DOM, with components updating when changes in state are detected. Vue's components possess lifecycle hooks for managing initialization, updates, and cleanup. Remarkably, a child component in Vue updates only when one of its received props changes—a feature that influences how you structure your components.

However, vue is the first framework on this list to leverage fined-grained reactivity. This means that components should, out of the box, only update UI DOM elements that changed.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I believe this is true for Svelte / Solid as well: for fine-grained reactivity systems, whether runtime or compile time, it is very rare for the user to have to think about manually optimizing over-renders across component boundaries.</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1469141353309224962?ref_src=twsrc%5Etfw">December 10, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

There are still ways to help optimize Vue's performance:

- Leverage directives like `v-once` for components that never require updates.
- Explore `v-memo`, similar to React's memoization, for fine-grained control over rerenders.

---

_**EDIT:** Vue seems to be going towards getting rid of VDom as well, with the introduction of Vapor. Let's keep updated._

---

### Store management in vue

Vue doesn't provide global state management tools out of the box, but the recommended one is Pinia (for Vue 3). Components consuming state from Pinia stores re-render only when the state they are using changes. This selective reactivity minimizes unnecessary re-renders in components that are not affected by specific state changes.

## Svelte: a paradigm shift

Svelte adopts a unique approach by compiling components into optimized JavaScript during the build process. This compile-time transformation negates the need for runtime Virtual DOM diffing, resulting in improved performance and smaller bundle sizes.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I feel that variable assignments triggering updates is still quite a stretch 😅</p>&mdash; Evan You (@youyuxi) <a href="https://twitter.com/youyuxi/status/1057295588973273088?ref_src=twsrc%5Etfw">October 30, 2018</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

---

_**EDIT:** With the introduction of runes in Svelte 5, the use of a signal-like primitive is now completefly explicit. It makes usage of those way easier, inside and outside `.svelte` files!_

---

### Store management in svelte

Svelte doesn't rely on external state management libraries. Instead, it encourages local component state or using the context API for global state management. In Svelte, components update when their local state changes. Context API can also trigger component updates when global state changes, ensuring components reflect the latest data.

## Solid: embracing fine-grained reactivity

Solid introduces a fine-grained reactivity system that minimizes unnecessary updates. Changes are precisely tracked, allowing only DOM elements directly affected by a change to re-render, what Ryan Carniato describes as Fine Grained Reactivity. This approach optimizes performance and avoids the overhead of traditional Virtual DOM diffing.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">A couple months back, <a href="https://twitter.com/solid_js?ref_src=twsrc%5Etfw">@solid_js</a> core member Milo(modderme) told me he wanted to explore how to improve the performance of fine-grained reactivity.<br><br>TLDR; He succeeded. And now he&#39;s showing us how. The amazing article explains how he wrote the fastest lib.<a href="https://t.co/KCppsS3oQH">https://t.co/KCppsS3oQH</a></p>&mdash; Ryan Carniato (@RyanCarniato) <a href="https://twitter.com/RyanCarniato/status/1598442561546653698?ref_src=twsrc%5Etfw">December 1, 2022</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

### Store management in solid

Solid provides a unique approach to state management by leveraging its reactivity system. UI DOM elements re-render only when the data they depend on changes. This efficient reactivity model helps avoid unnecessary re-renders, making Solid an attractive choice for applications that prioritize performance.

## Conclusion

As we've journeyed through the intricacies of component performance across various JavaScript frontend frameworks, we've uncovered a range of optimization techniques and approaches. React's Virtual DOM, Vue's selective reactivity, Angular's change detection strategies, and the innovative methodologies of Svelte and Solid each contribute to a diverse ecosystem of tools and concepts aimed at improving application performance.

By understanding when and why components re-render in these frameworks, and by embracing the nuances of their respective store management solutions, developers can effectively tackle performance bottlenecks. Employing strategies like composition, memoization, and adopting appropriate change detection approaches empowers developers to build responsive, efficient, and smooth user experiences.

Ultimately, the key to optimizing component performance lies in a comprehensive understanding of each framework's mechanics and a proactive approach to implementing the best-suited strategies for your specific use case. Armed with this knowledge, you're well-equipped to navigate the ever-evolving landscape of JavaScript frontend development and deliver applications that excel in both performance and user satisfaction.

## Sources

- https://www.developerway.com/posts/react-re-renders-guide
- https://angular.io/guide/change-detection
- https://vuejs.org/guide/best-practices/performance.html
- https://svelte.dev/blog/virtual-dom-is-pure-overhead
- https://betterprogramming.pub/the-fastest-way-to-render-the-dom-e3b226b15ca3
- https://svelte.dev/blog/svelte-3-rethinking-reactivity
- https://www.solidjs.com/guides/reactivity#how-it-works
- https://dev.to/ryansolid/a-hands-on-introduction-to-fine-grained-reactivity-3ndf
