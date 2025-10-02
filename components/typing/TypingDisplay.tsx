"use client"

type Props = {
  text: string
  userInput: string
}

export default function TypingDisplay({ text, userInput }: Props) {
  return (
    <div className="relative mb-8 p-8 rounded-lg bg-card border border-border h-[280px] flex items-center justify-center">
      <div className="text-2xl leading-relaxed font-mono max-w-3xl">
        <p className="text-balance">
          {text.split("").map((char, index) => {
            let className = "text-muted-foreground"
            if (index < userInput.length) {
              className =
                userInput[index] === char
                  ? "text-foreground"
                  : "text-red-500 bg-red-500/20"
            } else if (index === userInput.length) {
              className = "text-foreground border-l-2 border-primary"
            }
            return (
              <span key={index} className={className}>
                {char}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}