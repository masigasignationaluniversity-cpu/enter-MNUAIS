import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Send, AlertTriangle, CheckCircle, Download, Lock } from 'lucide-react';
import type { GradeValue } from '@/lib/types';

const GRADES: GradeValue[] = ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','4','5','INC','DRP'];
const REMOVAL_ELIGIBLE: GradeValue[] = ['4', 'INC'];

const getRemovalOptions = (grade: GradeValue): GradeValue[] => {
  if (grade === '4') return ['3.0', '5'] as GradeValue[];
  // INC
  return ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','5'] as GradeValue[];
};

const gradeColor = (g: GradeValue | null) => {
  if (!g) return 'text-gray-400';
  if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return 'text-green-700';
  if (g === '4') return 'text-yellow-600';
  if (g === '5') return 'text-red-600';
  if (g === 'INC') return 'text-orange-600';
  if (g === 'DRP') return 'text-gray-500';
  return 'text-gray-700';
};

export default function FacultyGradeEncoding() {
  const { state, submitGrade, submitGradesBatch, submitRemovalGrade, submitRemovalGradesBatch } = useApp();
  const faculty = state.currentUser;
  const mySections = state.sections.filter(s => s.facultyId === (faculty?.id ?? ''));
  const [selectedSection, setSelectedSection] = useState(mySections[0]?.id ?? '');

  if (!faculty) return null;
  const activeTerm = state.terms.find(t => t.isActive);

  const section = state.sections.find(s => s.id === selectedSection);
  const course = section ? state.courses.find(c => c.id === section.courseId) : null;
  const term = section ? state.terms.find(t => t.id === section.termId) : null;

  const gradeRecords = state.grades.filter(g => g.sectionId === selectedSection);
  const enrolled = state.enrollments.filter(e => e.sectionId === selectedSection && e.status !== 'dropped');

  const getStudent = (id: string) => state.users.find(u => u.id === id);

  const allGradesFilled = gradeRecords.every(g => g.grade !== null);
  const allSubmitted = gradeRecords.every(g => g.submitted);
  const anySubmitted = gradeRecords.some(g => g.submitted);
  const gradeOpen = term?.controls.gradeSubmissionOpen ?? false;

  const removalEligible = gradeRecords.filter(g => g.grade && REMOVAL_ELIGIBLE.includes(g.grade as GradeValue) && g.submitted);
  const removalAllFilled = removalEligible.every(g => g.removalGrade !== null && g.removalGrade !== undefined);
  const removalAnySubmitted = removalEligible.some(g => g.removalSubmitted);

  const exportGradesCSV = () => {
    if (!course || !section) return;
    const rows = ['Student Name,Student Number,Grade,Removal Grade,Submitted'];
    gradeRecords.forEach(g => {
      const student = getStudent(g.studentId);
      if (!student) return;
      rows.push(`"${student.name}","${student.studentNumber ?? ''}",${g.grade ?? 'N/A'},${g.removalGrade ?? 'N/A'},${g.submitted}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grades_${course.code}_Sec${section.sectionCode}_${term?.name || ''}.csv`.replace(/\s/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportEnlistedCSV = () => {
    if (!course || !section) return;
    const rows = ['Student Name,Student Number,Program,Year Level,Status'];
    enrolled.forEach(e => {
      const student = getStudent(e.studentId);
      if (!student) return;
      rows.push(`"${student.name}","${student.studentNumber ?? ''}","${student.program ?? ''}",${student.yearLevel ?? ''},${e.status}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EnlistedStudents_${course.code}_Sec${section.sectionCode}.csv`.replace(/\s/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grade Encoding</h1>
            <p className="text-gray-600 mt-1">Encode and submit student grades</p>
          </div>
          {section && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportEnlistedCSV}>
                <Download className="w-4 h-4" /> Enlisted CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportGradesCSV}>
                <Download className="w-4 h-4" /> Grades CSV
              </Button>
            </div>
          )}
        </div>

        {/* Section Selector */}
        <div className="flex flex-wrap gap-2">
          {mySections.map(sec => {
            const c = state.courses.find(x => x.id === sec.courseId);
            const t = state.terms.find(x => x.id === sec.termId);
            return (
              <Button key={sec.id} variant={selectedSection === sec.id ? 'default' : 'outline'}
                className={selectedSection === sec.id ? 'bg-primary text-white' : ''}
                onClick={() => setSelectedSection(sec.id)}>
                {c?.code} Sec {sec.sectionCode}
                {t?.isActive && <Badge className="ml-2 bg-green-500 text-white text-xs">Active</Badge>}
              </Button>
            );
          })}
        </div>

        {!section ? (
          <p className="text-gray-400 text-center py-8">No sections assigned.</p>
        ) : (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-gray-500">Course</p>
                    <p className="font-semibold">{course?.code} — {course?.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Section</p>
                    <p className="font-semibold">{section.sectionCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Term</p>
                    <p className="font-semibold">{term?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Enrolled</p>
                    <p className="font-semibold">{gradeRecords.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submission</p>
                    {gradeOpen
                      ? <Badge className="bg-green-100 text-green-800 text-xs">Open</Badge>
                      : <Badge className="bg-red-100 text-red-800 text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Closed</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="grades">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="grades">Encode Grades</TabsTrigger>
                <TabsTrigger value="removal">
                  Removal / Completion
                  {removalEligible.length > 0 && <Badge className="ml-2 bg-orange-500 text-white text-xs">{removalEligible.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              {/* Encode Grades Tab */}
              <TabsContent value="grades" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="text-base">Student Grades</CardTitle>
                      {!allSubmitted && gradeOpen && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-primary text-white gap-2" disabled={!allGradesFilled}>
                              <Send className="w-4 h-4" /> Submit All Grades
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Submit grades for all students?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <p className="text-sm text-gray-600 px-6">This will release grades to students (after they submit evaluations). This action cannot be undone.</p>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-primary text-white" onClick={() => submitGradesBatch(selectedSection)}>
                                Submit Grades
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {allSubmitted && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">All grades submitted</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!allGradesFilled && !anySubmitted && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-sm text-yellow-800">
                        <AlertTriangle className="w-4 h-4" />
                        Please fill in all grades before submitting.
                      </div>
                    )}
                    {!gradeOpen && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
                        <Lock className="w-4 h-4" />
                        Grade submission is currently closed by admin.
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>#</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Student No.</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeRecords.map((gr, idx) => {
                          const student = getStudent(gr.studentId);
                          if (!student) return null;
                          return (
                            <TableRow key={gr.id}>
                              <TableCell className="text-gray-400 text-sm">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell className="text-sm text-gray-500">{student.studentNumber}</TableCell>
                              <TableCell>
                                {gr.submitted ? (
                                  <span className={`font-bold text-sm ${gradeColor(gr.grade)}`}>{gr.grade ?? '—'}</span>
                                ) : (
                                  <Select
                                    value={gr.grade ?? ''}
                                    onValueChange={val => submitGrade(gr.id, val as GradeValue)}
                                    disabled={!gradeOpen}
                                  >
                                    <SelectTrigger className="w-28 h-8">
                                      <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {GRADES.map(g => (
                                        <SelectItem key={g} value={g}>
                                          <span className={gradeColor(g)}>{g}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {gr.submitted
                                  ? <Badge className="bg-green-100 text-green-800 text-xs">Submitted</Badge>
                                  : <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-xs">Pending</Badge>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {gradeRecords.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-6">No enrolled students.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Removal / Completion Tab */}
              <TabsContent value="removal" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <CardTitle className="text-base">Removal / Completion Grades</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Only students with grade <strong>4 or INC</strong> are eligible.</p>
                      </div>
                      {removalEligible.length > 0 && !removalAnySubmitted && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-2" disabled={!removalAllFilled}>
                              <Send className="w-4 h-4" /> Submit Removal Grades
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Submit removal/completion grades?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <p className="text-sm text-gray-600 px-6">This will update students' grade records with the removal/completion grade. This action cannot be undone.</p>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-orange-600 text-white" onClick={() => submitRemovalGradesBatch(selectedSection)}>
                                Submit Removal Grades
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {removalAnySubmitted && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Removal grades submitted</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!removalAllFilled && removalEligible.length > 0 && !removalAnySubmitted && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 text-sm text-yellow-800">
                        <AlertTriangle className="w-4 h-4" />
                        Please fill in removal grades for all eligible students before submitting.
                      </div>
                    )}
                    {removalEligible.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No students are eligible for removal/completion in this section.</p>
                        <p className="text-xs mt-1">Students with grade 4, 5, or INC will appear here once grades are submitted.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Student</TableHead>
                            <TableHead>Student No.</TableHead>
                            <TableHead className="text-center">Original Grade</TableHead>
                            <TableHead>Removal Grade</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {removalEligible.map(gr => {
                            const student = getStudent(gr.studentId);
                            if (!student) return null;
                            return (
                              <TableRow key={gr.id}>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell className="text-sm text-gray-500">{student.studentNumber}</TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-sm font-bold ${
                                    gr.grade === '4' ? 'bg-yellow-100 text-yellow-800' :
                                    gr.grade === '5' ? 'bg-red-100 text-red-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>{gr.grade}</Badge>
                                </TableCell>
                                <TableCell>
                                  {gr.removalSubmitted ? (
                                    <span className={`font-bold text-sm ${gradeColor(gr.removalGrade ?? null)}`}>{gr.removalGrade ?? '—'}</span>
                                  ) : (
                                    <Select
                                      value={gr.removalGrade ?? ''}
                                      onValueChange={val => submitRemovalGrade(gr.id, val as GradeValue)}
                                    >
                                      <SelectTrigger className="w-28 h-8">
                                        <SelectValue placeholder="Grade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getRemovalOptions(gr.grade!).map(g => (
                                          <SelectItem key={g} value={g}>
                                            <span className={gradeColor(g)}>{g}</span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {gr.removalSubmitted
                                    ? <Badge className="bg-green-100 text-green-800 text-xs">Updated</Badge>
                                    : gr.removalGrade
                                      ? <Badge variant="outline" className="text-blue-700 border-blue-300 text-xs">Ready</Badge>
                                      : <Badge variant="outline" className="text-gray-500 border-gray-200 text-xs">Not Set</Badge>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
