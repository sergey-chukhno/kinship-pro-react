import React from 'react';
import './ClassCard.css';

interface ClassCardProps {
  name: string;
  teacher: string;
  studentCount: number;
}

const ClassCard: React.FC<ClassCardProps> = ({ name, teacher, studentCount }) => {
  return (
    <div className="class-card">
      <div className="class-card-header">
        <img src="/icons_logo/Icon=Class.svg" alt="Classe" className="class-icon" />
        <h4>{name}</h4>
      </div>
      <div className="class-card-body">
        <p><strong>Professeur :</strong> {teacher}</p>
        <p><strong>Étudiants :</strong> {studentCount}</p>
      </div>
    </div>
  );
};

export default ClassCard;
