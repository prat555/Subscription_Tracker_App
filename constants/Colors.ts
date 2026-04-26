export const lightColors = {
  background: "#F9F8F6",
  surface: "#FFFFFF",
  surface_secondary: "#F2F0EA",
  primary: "#D9654B",
  primary_light: "#FCEEE9",
  text_primary: "#1C1B1A",
  text_secondary: "#6B6863",
  border: "#E8E6E1",
  success: "#3E9C74",
  danger: "#D94B4B",
  warning: "#D99C4B",
};

export const darkColors = {
  background: "#121211",
  surface: "#1C1C1A",
  surface_secondary: "#262624",
  primary: "#E87A60",
  primary_light: "#36201B",
  text_primary: "#F4F3F0",
  text_secondary: "#9E9B95",
  border: "#33312E",
  success: "#4AB588",
  danger: "#E85D5D",
  warning: "#E8B25D",
};

export const CATEGORIES = [
  { name: "Entertainment", icon: "film", color: "#D94B4B" },
  { name: "Music", icon: "music", color: "#3E9C74" },
  { name: "Shopping", icon: "shopping-bag", color: "#4A9CD9" },
  { name: "Productivity", icon: "briefcase", color: "#D9654B" },
  { name: "Gaming", icon: "zap", color: "#7B4BD9" },
  { name: "Health", icon: "heart", color: "#4AB588" },
  { name: "News", icon: "file-text", color: "#9E9B95" },
  { name: "Education", icon: "book", color: "#D99C4B" },
  { name: "Other", icon: "tag", color: "#6B6863" },
];

export const getCategoryConfig = (name: string) => {
  return (
    CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1]
  );
};
