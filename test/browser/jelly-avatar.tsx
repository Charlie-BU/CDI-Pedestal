// Synthetic offline fixture: no authentication or business API calls.
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@cloud-materials/common/dist/css/index.css';
import '@/App.less';
import '@/i18n';
import Header from '@/components/Layout/Header';
import UserAvatar from '@/components/User/UserAvatar';
import { useUser } from '@/hooks/useUser';
import { jellyConfigFixture } from '../fixtures/jelly-config';
const user = { id: 1, username: 'Fixture', nickname: '示例成员', email: 'fixture@example.invalid', role: 'member', level: 1, created_at: '2026-10-19T00:00:00Z', has_password: true, auth_providers: [], jelly_config: jellyConfigFixture };
useUser.setState({ user, accessToken: '', loading: false });
ReactDOM.createRoot(document.getElementById('root')!).render(<MemoryRouter><Header /><main style={{padding:32,display:'flex',gap:32,alignItems:'center'}}><div>32px · 有配置<UserAvatar user={user} size={32}/></div><div>40px · 有配置<UserAvatar user={user} size={40}/></div><div>32px · 无配置<UserAvatar user={{...user,jelly_config:null}} size={32}/></div><button onClick={()=>useUser.setState({user:{...user,jelly_config:null}})}>顶部切换为首字母</button><button onClick={()=>useUser.setState({user})}>顶部切换为水母</button></main></MemoryRouter>);
