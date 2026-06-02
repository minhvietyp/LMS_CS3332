import { Skeleton } from 'antd';

export function ShellLoadingState() {
  return (
    <div style={{ padding: 16 }}>
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
  );
}
