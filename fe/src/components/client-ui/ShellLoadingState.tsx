import { Skeleton } from 'antd';
import './client-ui.css';

export function ShellLoadingState() {
  return (
    <div className="client-shell-loading-state">
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
  );
}
