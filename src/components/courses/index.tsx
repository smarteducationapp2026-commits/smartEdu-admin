import { useEffect, useState } from 'react'
import { listCourses, updateCourseOffer } from '../../services/courses'
import type { Course } from '../../core/types'

export function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  useEffect(() => {
    void listCourses().then(setCourses)
  }, [])
  async function save(course: Course) {
    await updateCourseOffer(course)
    setCourses((items) => items.map((item) => (item.id === course.id ? course : item)))
  }
  return (
    <div className="stack">
      {courses.length === 0 && (
        <div className="card">
          <p>
            No courses found. Add course documents to the <code>courses</code> collection.
          </p>
        </div>
      )}
      {courses.map((course) => (
        <div className="card row course" key={course.id}>
          <div>
            <h3>{course.title}</h3>
            <small>{course.id}</small>
          </div>
          <input
            value={course.offer || ''}
            placeholder="Offer, e.g. 20% off"
            onChange={(e) =>
              setCourses((items) =>
                items.map((item) =>
                  item.id === course.id ? { ...item, offer: e.target.value } : item,
                ),
              )
            }
          />
          <button onClick={() => save(course)}>Save offer</button>
        </div>
      ))}
    </div>
  )
}
