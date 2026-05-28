import { capsule, query } from "lakebed/server";

export default capsule({
  schema: {},

  queries: {
    viewer: query((ctx) => ({ userId: ctx.auth.userId }))
  },

  mutations: {}
});
