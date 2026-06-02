import { useMemo } from 'react';
import { Card, Col, Empty, Row, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AdminPageContainer } from '../../../components/admin-layout/layout/AdminPageContainer';
import { useAdminCourseProgressList, useAdminProgressOverview } from '../../../hooks/useProgressOverview';
import type { AdminCourseProgressItem } from '../../../types/progress';

export function AdminAnalyticsPage() {
  const overviewQuery = useAdminProgressOverview();
  const coursesQuery = useAdminCourseProgressList({
    page: 1,
    pageSize: 10,
    sortBy: 'progress',
    sortOrder: 'desc',
  });

  const columns = useMemo<ColumnsType<AdminCourseProgressItem>>(
    () => [
      {
        title: 'Course',
        dataIndex: 'courseTitle',
        key: 'courseTitle',
      },
      {
        title: 'Instructor',
        dataIndex: 'instructorName',
        key: 'instructorName',
      },
      {
        title: 'Students',
        dataIndex: 'totalStudents',
        key: 'totalStudents',
      },
      {
        title: 'Weighted Progress',
        dataIndex: 'averageWeightedProgress',
        key: 'averageWeightedProgress',
        render: (value: number) => `${value}%`,
      },
    ],
    [],
  );

  return (
    <AdminPageContainer
      title="Admin Analytics"
      subtitle="Review platform-wide learning health, completion trends, and course-level performance signals."
    >
      {overviewQuery.data ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}><Card><Typography.Text>Total Courses</Typography.Text><Typography.Title level={3}>{overviewQuery.data.summary.totalCourses}</Typography.Title></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Typography.Text>Total Students</Typography.Text><Typography.Title level={3}>{overviewQuery.data.summary.totalStudents}</Typography.Title></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Typography.Text>Weighted Avg Progress</Typography.Text><Typography.Title level={3}>{overviewQuery.data.summary.averageWeightedProgress}%</Typography.Title></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Typography.Text>Completion Rate</Typography.Text><Typography.Title level={3}>{overviewQuery.data.summary.averageCompletionRate}%</Typography.Title></Card></Col>
        </Row>
      ) : (
        <Empty description="Admin analytics is not available." />
      )}

      <Card style={{ marginTop: 16 }}>
        <Typography.Title level={4}>Highest Progress Courses</Typography.Title>
        <Table
          rowKey="courseId"
          columns={columns}
          dataSource={coursesQuery.data?.courses ?? []}
          loading={overviewQuery.isLoading || coursesQuery.isLoading}
          pagination={false}
        />
      </Card>
    </AdminPageContainer>
  );
}
