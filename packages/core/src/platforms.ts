import { z } from "zod";

export const platformIdSchema = z.enum([
  "rednote",
  "weibo",
  "zhihu",
  "bilibili",
  "douyin",
  "wechat_channels",
]);

export type PlatformId = z.infer<typeof platformIdSchema>;

export type Platform = {
  id: PlatformId;
  name: string;
  publishUrl: string;
  description: string;
};

export const platforms = [
  {
    id: "rednote",
    name: "小红书",
    publishUrl: "https://creator.xiaohongshu.com/publish/publish",
    description: "创作服务平台",
  },
  {
    id: "weibo",
    name: "微博",
    publishUrl: "https://weibo.com/",
    description: "微博发布首页",
  },
  {
    id: "zhihu",
    name: "知乎",
    publishUrl: "https://www.zhihu.com/creator",
    description: "知乎创作中心",
  },
  {
    id: "bilibili",
    name: "Bilibili",
    publishUrl:
      "https://member.bilibili.com/platform/upload/video/frame?spm_id_from=333.1007.top_bar.upload",
    description: "哔哩哔哩视频投稿",
  },
  {
    id: "douyin",
    name: "抖音",
    publishUrl: "https://creator.douyin.com/creator-micro/content/upload",
    description: "抖音创作者中心",
  },
  {
    id: "wechat_channels",
    name: "微信视频号",
    publishUrl: "https://channels.weixin.qq.com/platform/post/create",
    description: "视频号助手",
  },
] as const satisfies readonly Platform[];

export const platformMap = new Map(platforms.map((platform) => [platform.id, platform]));
