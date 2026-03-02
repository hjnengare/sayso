import { Brush, Pizza, Scissors, Music, Wine, Dumbbell, Calendar } from "@/app/lib/icons";

interface EventIconProps {
  iconName?: string;
  className?: string;
}

export default function EventIcon({ iconName, className = "w-16 h-16 text-navbar-bg/90 drop-shadow-sm" }: EventIconProps) {
  const getIconComponent = (name: string) => {
    switch (name) {
      case "paint-brush-outline":
        return Brush;
      case "pizza-outline":
        return Pizza;
      case "cut-outline":
        return Scissors;
      case "musical-notes-outline":
        return Music;
      case "wine-outline":
        return Wine;
      case "body-outline":
        return Dumbbell;
      default:
        return Calendar;
    }
  };

  const IconComponent = getIconComponent(iconName || "");

  return <IconComponent className={className} />;
}
