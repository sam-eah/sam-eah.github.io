---
title: 'Coming around Angular'
description: ''
pubDate: 'Apr 01 2023'
heroImage: '/angular.JPG'
---


**Angular** was the 3rd frontend framework I started to work with. First one was **Vue2/Nuxt2**, then came **React/Next**. 

**Vue** will always have a special place in my heart, given it’s the one that made me fall in love with frontend development. It was so simple yet so effective. I love **single file components**, state and computed properties, **two way binding**, … **Nuxt** was a revolution for me. Despite being heavily inspired by Next (from what I’ve heard), it came with crazy ideas and a wild ecosystem. I could write and deploy a full stack application in a no time, with little to none knowledge regarding backend or servers. The migration to vue 3 `script setup` (and react-inspired hooks) was not as difficult for me as it seems to have been to a lot of folks out there.

**React** had it’s moment. I really liked the introduction of **functional components** (I found class components so ugly and verbose), and later of **hooks** that made them properly usable.
**UseEffect** logic was flirting with UB (unexpected behaviour), but made some sort of sense when you knew the doc.
However, till this day, I can’t grasp how they chose that the components would **rerender** on each updates. I also find the syntax of useState returning an array with a getter and setter really annoying, but that’s a personal taste.
There are lots of other things that I dislike about React, but it’s not this time’s topic.

My first impression of **Angular** was really bad. To create a single component, you had to write **4 files** (ts, html, css, specs — you could write all in the .ts class but it was considered bad practise back then), then add it to **ngModules** declaration. You had to export it as well to use it in another module, and of course import it in the correct one. You had to do this for EVERY components. 


<div style="margin: 30px; margin-inline:60px; font-style: italic;">
Needless to say it blew my mind to later discover than NestJs decided to inspire itself from Angular in its structure…
</div>


Moreover, you *had* to use typescript. My first experiences with it, a while before, where catastrophic. 
Of course, now I wouldn’t ever write a project in plain js, without typescript. 



<div style="margin: 30px; margin-inline:60px; font-style: italic;">
Well at least typescript types and langage server if not .ts files, I can very well live without the compilation, even if it means using ugly jsdoc annotations...
</div>


I don’t think I still have to defend ts benefits in this day and age, but just to cite a few: way less runtime errors (the lsp catches a lot, and the compiler too), linting, autocompletion, … Projects are way easier to maintain and to build in teams.


<div style="margin: 30px; margin-inline:60px; font-style: italic;">
Downside of ts is that it made me dislike most dynamically typed languages, such as python (it seems there are some projects similar to ts for python but none seem to have really shined. I’m also familiar with type annotation, that I use quite a lot, but unfortunately the LSP is quite weak and type inference not quite there, even when using pycharm).
</div>


I also had a hard time with **RxJs**. It really was a paradigm shift. It seemed over complicated for no apparent reason. You had to learn a consequent amount of its API and functions to get going. Observables (or subjects) where a way to build **computed properties**, but ther was a lot of boilerplate.


<div style="margin: 30px; margin-inline:60px; font-style: italic;">
In vue you would simply use a computed (that would be already really performant), in react you would declare a variable based on a state variable (that would be recalculated on each re render) or use a useMemo if you care about performance (but you have to explicitly provide the dependency array).
</div>


Most of the time I would end up using **ngOnChanges** (the horror) or **getters and setters**. 
I began to grasp the potential of RxJs when dealing with **asynchronous** code. It was a perfect way to define actions, declaratively. That’s how I started to fall in love with **declarative programming**, and "sort of" **functional programming**. (To the point where I wanted to use RxJs in every projects for a time… You may not remember but doing retries, handling race conditions etc for http requests in React -- before **react-query** -- was a nightmare)

Another really nice thing that came with **observables** was the opportunity to create simple **stores**, natively, without 3rd party libraries, with the help of angular **services** and **dependency injection**. 
That’s when I started to really enjoy the batteries included framework. For UI, **Material** was really easy to implement (even though really hard to personalise). Angular also came with one of the best **form input handling** (two way binding, validation, etc). Still one of the best I've used to this day!

Later, a lot of new changes started to appear. I remember the surprise to see RFCs in the GitHub repo, for a project known to be very stagnant, and also pretty opaque in terms of development. 
First big one was [**Standalone components**](https://github.com/angular/angular/discussions/43784), then [**Strictly Typed Reactive Forms**](https://github.com/angular/angular/discussions/44513), then came the[ `inject`](https://angular.io/api/core/inject) method, then [**Signals**](https://github.com/angular/angular/discussions/49685), [**Control Flow & Deferred Loading**](https://github.com/angular/angular/discussions/51241), … I was so hyped. I followed the comments with great concern, and started implementing most of the features as soon as the were released.
The debate between **signals** and **RxJs** was very intense. It was finally agreed that even though RxJs made perfect sense for **asynchronous** code handling, it was way too complicated (and even bad design in some cases -- see **diamond problem**) for **synchronous** code.

In the meantime, I had the opportunity to try quite a few other JS frameworks (remember that at some point, one was coming out every day). 
However, I still think that **Angular** is one of today’s most interesting ones. I could totally recommend it to new devs, especially since it’s widely used in **production**, and there are a lot of **professional opportunities** (*but keep in mind that it most likely won’t be on the latest versions yet*). 
One downfall is that even though the documentation seem to be already up to date, you’ll most likely stumble open old articles/stack overflow questions using previous versions, giving solutions that might not be up to date and idiomatic. But that’s an issue that most libraries are confronted to when releasing big changes…