---
title: 'GraphQL and alternatives'
description: ''
pubDate: 'Mar 09 2024'
heroImage: '/graphql.png'
---

GraphQL has become the cool kid on the block for web development, promising flexibility and efficiency in handling data. However, let's pump the brakes for a moment and explore why using GraphQL might not always be the best idea. This isn't to say GraphQL is bad, but there are situations where it might not be the superhero it seems to be.

### Learning might feel like a rollercoaster:
GraphQL comes with a learning curve. If you're used to traditional RESTful APIs, diving into GraphQL can feel like learning a new language. For teams on tight schedules or those who aren't looking for a new challenge, this learning curve might be more of a hurdle than a helpful step forward.

### Data overload or underload:
The idea behind GraphQL is to let clients ask for exactly what they need. Sounds great, but it's not foolproof. If your queries are not well-optimized, you might still end up fetching more data than necessary (over-fetching) or miss out on important bits (under-fetching). It's like ordering at a restaurant – you want just the right amount, not too much or too little.

### Security is a team sport:
GraphQL's flexibility can be a double-edged sword when it comes to security. If not set up properly, bad actors could exploit your queries and launch attacks. Think of it like handing the keys to your server; you need to set up proper checks and balances to keep the mischievous ones at bay.

### Backend becomes a puzzle:
While GraphQL makes things smooth on the client side, the server might feel the heat. Implementing resolvers, managing data relationships, and optimizing queries can become a bit like solving a complex puzzle. For smaller projects or those without intricate data needs, this added complexity might feel like using a sledgehammer to crack a nut.

### Cache considerations:
Caching is like the secret sauce for fast web applications. With GraphQL, figuring out how to cache effectively can be trickier compared to the more straightforward RESTful APIs. You'll need to roll up your sleeves and put in some extra effort to get the caching game strong with GraphQL.

## Alternatives

1. tRPC

As an alternative consideration, tRPC stands out as a noteworthy option for those seeking a typesafe fetching strategy. The beauty of web development lies in its diversity of tools and approaches, and tRPC is just one of the contenders. Before committing to any technology, it's wise to explore various options that align with your project's requirements and your team's preferences.

tRPC, offers a fresh take on data fetching that combines the goodness of TypeScript with the simplicity of RPC (Remote Procedure Call). With tRPC, you get the type safety you crave without sacrificing the ease of use. It's like having your cake and eating it too.

Consider giving tRPC a spin, especially if you're working in a TypeScript-heavy environment. It brings a breeze of simplicity to data fetching, making your codebase cleaner and more maintainable. It might just be the missing piece that perfectly fits into your web development puzzle.

2. TypeScript MonoRepo

Similarly, if you're using typescript for both your frontend and backend, an other option is to put your interfaces in a shared package in a monorepo.

1. OpenAPI codegen

A last option we'll explore is similar to graphql in the sense that it relies on code generation, this time the schema is given by the swagger created following openAPI's rules. If you already follow those, and have a swagger, it requires very few adjustements (at least in your backend). 

- #### [drwpow/openapi-typescript](https://github.com/drwpow/openapi-typescript)

Still not mature enough.

- #### [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts)

The most mature one.

- #### [microsoft/kiota](https://github.com/microsoft/kiota)

Kiota has the advantage to be available for a large number of langages. Unfortunatly, typescript is still in beta and unstable, but it already has a lot of interesting ideas.


## Conclusion:

In wrapping up our exploration of GraphQL, it's essential to acknowledge that there's no one-size-fits-all solution in the dynamic world of web development. While GraphQL has its merits, it's not the only player in the game.

Whether it's GraphQL, RESTful APIs, tRPC, or another tool yet to be discovered, the key is to find the right fit for your unique needs. Each tool brings its strengths to the table, so don't hesitate to experiment and discover what works best for you. Happy coding!