/**
 * 开发期演示页（骨架占位）。
 *
 * 刻意不写任何样式 —— 令牌层（styles/tokens）尚未实现，
 * 此时写 inline style 或颜色值会立刻违反项目纪律（组件与演示页只消费 var(--ls-*)）。
 * 等令牌层与 ThemeProvider 跑通后，这里会替换成组件陈列 + 令牌可视化页。
 */
export default function App() {
  return (
    <main>
      <h1>ls-design</h1>
      <p>骨架已就绪。下一步：令牌层 styles/tokens。</p>
    </main>
  );
}
