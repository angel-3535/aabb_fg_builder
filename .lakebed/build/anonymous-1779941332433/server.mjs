// ../../../.npm/_npx/3eb8d3eaaf4ef1b4/node_modules/lakebed/src/server.js
function capsule(definition) {
  return definition;
}
function query(handler) {
  return handler;
}
function mutation(handler) {
  return handler;
}
function field(kind) {
  return {
    kind,
    defaultValue: void 0,
    default(value) {
      return {
        ...this,
        defaultValue: value
      };
    }
  };
}
function table(fields) {
  return {
    kind: "table",
    fields
  };
}
function string() {
  return field("string");
}
function boolean() {
  return field("boolean");
}

// lakebed-source:shared/todo.ts
function cleanTodoText(value) {
  return value.trim().slice(0, 160);
}

// lakebed-source:server/index.ts
var server_default = capsule({
  schema: {
    todos: table({
      text: string(),
      done: boolean().default(false),
      ownerId: string()
    })
  },
  queries: {
    todos: query(
      (ctx) => ctx.db.todos.where("ownerId", ctx.auth.userId).orderBy("createdAt", "desc").all()
    )
  },
  mutations: {
    addTodo: mutation((ctx, text) => {
      const cleanText = cleanTodoText(text);
      if (!cleanText) {
        return;
      }
      ctx.db.todos.insert({ text: cleanText, ownerId: ctx.auth.userId });
    })
  }
});
export {
  server_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vLi4vLi4vLm5wbS9fbnB4LzNlYjhkM2VhYWY0ZWYxYjQvbm9kZV9tb2R1bGVzL2xha2ViZWQvc3JjL3NlcnZlci5qcyIsICJsYWtlYmVkLXNvdXJjZTpzaGFyZWQvdG9kby50cyIsICJsYWtlYmVkLXNvdXJjZTpzZXJ2ZXIvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImV4cG9ydCBmdW5jdGlvbiBjYXBzdWxlKGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWVyeShoYW5kbGVyKSB7XG4gIHJldHVybiBoYW5kbGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbXV0YXRpb24oaGFuZGxlcikge1xuICByZXR1cm4gaGFuZGxlcjtcbn1cblxuZnVuY3Rpb24gZmllbGQoa2luZCkge1xuICByZXR1cm4ge1xuICAgIGtpbmQsXG4gICAgZGVmYXVsdFZhbHVlOiB1bmRlZmluZWQsXG4gICAgZGVmYXVsdCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udGhpcyxcbiAgICAgICAgZGVmYXVsdFZhbHVlOiB2YWx1ZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0YWJsZShmaWVsZHMpIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBcInRhYmxlXCIsXG4gICAgZmllbGRzXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcoKSB7XG4gIHJldHVybiBmaWVsZChcInN0cmluZ1wiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJvb2xlYW4oKSB7XG4gIHJldHVybiBmaWVsZChcImJvb2xlYW5cIik7XG59XG4iLCAiZXhwb3J0IHR5cGUgVG9kbyA9IHtcbiAgaWQ6IHN0cmluZztcbiAgdGV4dDogc3RyaW5nO1xuICBkb25lOiBib29sZWFuO1xuICBvd25lcklkOiBzdHJpbmc7XG4gIGNyZWF0ZWRBdDogc3RyaW5nO1xuICB1cGRhdGVkQXQ6IHN0cmluZztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhblRvZG9UZXh0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUudHJpbSgpLnNsaWNlKDAsIDE2MCk7XG59XG4iLCAiaW1wb3J0IHsgYm9vbGVhbiwgY2Fwc3VsZSwgbXV0YXRpb24sIHF1ZXJ5LCBzdHJpbmcsIHRhYmxlIH0gZnJvbSBcImxha2ViZWQvc2VydmVyXCI7XG5pbXBvcnQgeyBjbGVhblRvZG9UZXh0IH0gZnJvbSBcIi4uL3NoYXJlZC90b2RvXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGNhcHN1bGUoe1xuICBzY2hlbWE6IHtcbiAgICB0b2RvczogdGFibGUoe1xuICAgICAgdGV4dDogc3RyaW5nKCksXG4gICAgICBkb25lOiBib29sZWFuKCkuZGVmYXVsdChmYWxzZSksXG4gICAgICBvd25lcklkOiBzdHJpbmcoKVxuICAgIH0pXG4gIH0sXG5cbiAgcXVlcmllczoge1xuICAgIHRvZG9zOiBxdWVyeSgoY3R4KSA9PlxuICAgICAgY3R4LmRiLnRvZG9zXG4gICAgICAgIC53aGVyZShcIm93bmVySWRcIiwgY3R4LmF1dGgudXNlcklkKVxuICAgICAgICAub3JkZXJCeShcImNyZWF0ZWRBdFwiLCBcImRlc2NcIilcbiAgICAgICAgLmFsbCgpXG4gICAgKVxuICB9LFxuXG4gIG11dGF0aW9uczoge1xuICAgIGFkZFRvZG86IG11dGF0aW9uKChjdHgsIHRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgY2xlYW5UZXh0ID0gY2xlYW5Ub2RvVGV4dCh0ZXh0KTtcbiAgICAgIGlmICghY2xlYW5UZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY3R4LmRiLnRvZG9zLmluc2VydCh7IHRleHQ6IGNsZWFuVGV4dCwgb3duZXJJZDogY3R4LmF1dGgudXNlcklkIH0pO1xuICAgIH0pXG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFPLFNBQVMsUUFBUSxZQUFZO0FBQ2xDLFNBQU87QUFDVDtBQUVPLFNBQVMsTUFBTSxTQUFTO0FBQzdCLFNBQU87QUFDVDtBQUVPLFNBQVMsU0FBUyxTQUFTO0FBQ2hDLFNBQU87QUFDVDtBQUVBLFNBQVMsTUFBTSxNQUFNO0FBQ25CLFNBQU87QUFBQSxJQUNMO0FBQUEsSUFDQSxjQUFjO0FBQUEsSUFDZCxRQUFRLE9BQU87QUFDYixhQUFPO0FBQUEsUUFDTCxHQUFHO0FBQUEsUUFDSCxjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxNQUFNLFFBQVE7QUFDNUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ047QUFBQSxFQUNGO0FBQ0Y7QUFFTyxTQUFTLFNBQVM7QUFDdkIsU0FBTyxNQUFNLFFBQVE7QUFDdkI7QUFFTyxTQUFTLFVBQVU7QUFDeEIsU0FBTyxNQUFNLFNBQVM7QUFDeEI7OztBQzdCTyxTQUFTLGNBQWMsT0FBdUI7QUFDbkQsU0FBTyxNQUFNLEtBQUssRUFBRSxNQUFNLEdBQUcsR0FBRztBQUNsQzs7O0FDUkEsSUFBTyxpQkFBUSxRQUFRO0FBQUEsRUFDckIsUUFBUTtBQUFBLElBQ04sT0FBTyxNQUFNO0FBQUEsTUFDWCxNQUFNLE9BQU87QUFBQSxNQUNiLE1BQU0sUUFBUSxFQUFFLFFBQVEsS0FBSztBQUFBLE1BQzdCLFNBQVMsT0FBTztBQUFBLElBQ2xCLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFBTSxDQUFDLFFBQ1osSUFBSSxHQUFHLE1BQ0osTUFBTSxXQUFXLElBQUksS0FBSyxNQUFNLEVBQ2hDLFFBQVEsYUFBYSxNQUFNLEVBQzNCLElBQUk7QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUFBLEVBRUEsV0FBVztBQUFBLElBQ1QsU0FBUyxTQUFTLENBQUMsS0FBSyxTQUFpQjtBQUN2QyxZQUFNLFlBQVksY0FBYyxJQUFJO0FBQ3BDLFVBQUksQ0FBQyxXQUFXO0FBQ2Q7QUFBQSxNQUNGO0FBRUEsVUFBSSxHQUFHLE1BQU0sT0FBTyxFQUFFLE1BQU0sV0FBVyxTQUFTLElBQUksS0FBSyxPQUFPLENBQUM7QUFBQSxJQUNuRSxDQUFDO0FBQUEsRUFDSDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
