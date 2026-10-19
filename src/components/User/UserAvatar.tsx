import { forwardRef, lazy, Suspense, type HTMLAttributes } from "react";
import { Avatar } from "@cloud-materials/common";

const ConfiguredJellyAvatar = lazy(() => import("./jelly/ConfiguredJellyAvatar"));

/** AvatarUser：头像展示需要的用户资料。 */
export interface AvatarUser {
    username: string;
    nickname?: string | null;
    jelly_config?: unknown;
}

/** UserAvatarProps：头像尺寸、资料和浮层交互属性。 */
type UserAvatarProps = HTMLAttributes<HTMLSpanElement> & { user: AvatarUser; size: number; jellyFill?: number };

/** UserAvatar：有配置时展示像素水母，其余情况保留用户名首字母。 */
const UserAvatar = forwardRef<HTMLSpanElement, UserAvatarProps>(function UserAvatar(
    { user, size, jellyFill = 1.75, className, style, ...events }, ref,
) {
    const initials = user.nickname?.[0] || user.username[0];
    const fallback = <Avatar size={size} className={className}>{initials}</Avatar>;
    return (
        <span ref={ref} {...events} style={{ display: "inline-flex", verticalAlign: "middle", width: size, height: size, ...style }}>
            {user.jelly_config == null ? fallback : (
                <Suspense fallback={fallback}>
                    <ConfiguredJellyAvatar config={user.jelly_config} size={size} fill={jellyFill} fallback={fallback} />
                </Suspense>
            )}
        </span>
    );
});
export default UserAvatar;
