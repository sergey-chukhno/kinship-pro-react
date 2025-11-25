import React from 'react';
import './ClassCard.css';

interface ClassCardProps {
  name: string;
  teacher: string;
  studentCount: number;
  level?: string;
  onClick?: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ name, teacher, studentCount, level, onClick }) => {
  return (
    <div className="class-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="class-card-header">
        {/* <img src="/icons_logo/Icon=Class.svg" alt="Classe" className="class-icon" /> */}
        <i className="fas fa-school"></i>
        <h4>{name}</h4>
      </div>
      <div className="class-card-body">
        <p><strong>Niveau :</strong> {level}</p>
        {/* <p><strong>Professeur :</strong> {teacher}</p> */}
        <p><strong>Étudiants :</strong> {studentCount}</p>
      </div>
    </div>
  );
};

export default ClassCard;
