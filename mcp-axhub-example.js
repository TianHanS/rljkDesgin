// 示例：使用 aisdk-mcp-bridge 连接 Axhub MCP 服务器
import { initializeMcp, getMcpTools, cleanupMcp } from 'aisdk-mcp-bridge';

async function main() {
  try {
    // 初始化 MCP 服务
    await initializeMcp({ debug: true });

    // 获取 Axhub MCP 工具
    const axhubTools = await getMcpTools({ 
      debug: true, 
      serverName: 'axhub' 
    });

    console.log('Axhub MCP 工具列表:', Object.keys(axhubTools));
    
    // 在这里可以使用这些工具与 AI 模型交互
    // 例如：使用 generateText 或其他 AI SDK 功能
    
  } catch (error) {
    console.error('MCP 连接错误:', error);
  } finally {
    // 清理资源
    await cleanupMcp();
  }
}

main();