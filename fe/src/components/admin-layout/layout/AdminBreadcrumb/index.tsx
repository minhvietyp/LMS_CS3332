import { Breadcrumb } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { getUserByIdRequest } from '../../../../services/api/authApi';
import { getCourseByIdRequest } from '../../../../services/api/courseApi';
import { getAdminNavigationMatch } from '../adminNavigation';
import './AdminBreadcrumb.css';

export function AdminBreadcrumb() {
  const location = useLocation();
  const editMatch = matchPath('/admin/users/:id/edit', location.pathname);
  const detailMatch = matchPath('/admin/users/:id', location.pathname);
  const userId = editMatch?.params.id ?? detailMatch?.params.id ?? null;
  const courseEditMatch = matchPath('/admin/courses/:id/edit', location.pathname);
  const courseDetailMatch = matchPath('/admin/courses/:id', location.pathname);
  const courseId = courseEditMatch?.params.id ?? courseDetailMatch?.params.id ?? null;

  const userLabelQuery = useQuery({
    queryKey: ['admin-breadcrumb', 'user', userId],
    queryFn: () => getUserByIdRequest(userId!),
    enabled: Boolean(userId && location.pathname !== '/admin/users/create'),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const courseLabelQuery = useQuery({
    queryKey: ['admin-breadcrumb', 'course', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    retry: 1,
    staleTime: 60 * 1000,
  });

  const userLabel = userLabelQuery.data?.name ?? null;
  const courseLabel = courseLabelQuery.data?.title ?? null;

  const items = useMemo<Array<{ title: ReactNode }>>(() => {
    const current = getAdminNavigationMatch(location.pathname);
    const baseItems: Array<{ title: ReactNode }> = [{ title: <Link to="/dashboard">Dashboard</Link> }];

    if (location.pathname === '/admin/users') {
      baseItems.push({ title: 'Users' });
      return baseItems;
    }

    if (location.pathname === '/admin/users/create') {
      baseItems.push({ title: <Link to="/admin/users">Users</Link> });
      baseItems.push({ title: 'Add User' });
      return baseItems;
    }

    if (editMatch?.params.id) {
      const resolvedLabel = userLabel ?? editMatch.params.id;
      baseItems.push({ title: <Link to="/admin/users">Users</Link> });
      baseItems.push({ title: <Link to={`/admin/users/${editMatch.params.id}`}>{resolvedLabel}</Link> });
      baseItems.push({ title: 'Edit' });
      return baseItems;
    }

    if (detailMatch?.params.id) {
      const resolvedLabel = userLabel ?? detailMatch.params.id;
      baseItems.push({ title: <Link to="/admin/users">Users</Link> });
      baseItems.push({ title: resolvedLabel });
      return baseItems;
    }

    if (location.pathname === '/admin/courses/create') {
      baseItems.push({ title: <Link to="/admin/courses">Courses</Link> });
      baseItems.push({ title: 'Add Course' });
      return baseItems;
    }

    if (courseEditMatch?.params.id) {
      const resolvedLabel = courseLabel ?? courseEditMatch.params.id;
      baseItems.push({ title: <Link to="/admin/courses">Courses</Link> });
      baseItems.push({ title: <Link to={`/admin/courses/${courseEditMatch.params.id}`}>{resolvedLabel}</Link> });
      baseItems.push({ title: 'Edit' });
      return baseItems;
    }

    if (courseDetailMatch?.params.id) {
      const resolvedLabel = courseLabel ?? courseDetailMatch.params.id;
      baseItems.push({ title: <Link to="/admin/courses">Courses</Link> });
      baseItems.push({ title: resolvedLabel });
      return baseItems;
    }

    if (current && current.path !== '/dashboard') {
      baseItems.push({ title: current.breadcrumbLabel ?? current.label });
    }

    return baseItems;
  }, [courseDetailMatch, courseEditMatch, courseLabel, detailMatch, editMatch, location.pathname, userLabel]);

  return <Breadcrumb className="admin-breadcrumb" items={items} />;
}
