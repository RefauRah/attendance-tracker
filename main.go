package main

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Attendance struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"lat" binding:"required"`
	Longitude float64 `json:"lng" binding:"required"`
	Distance  float64 `json:"distance"`
	Status    string  `json:"status"`
	Time      string  `json:"time"`
	Timestamp string  `json:"timestamp"`
}

func main() {
	dsn := "user:password@tcp(localhost:3306)/attendance_db?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.AutoMigrate(&Attendance{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	sqlDB, _ := db.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	router := gin.Default()

	// Add CORS middleware
	router.Use(cors.Default())

	router.POST("/api/attendance/save", func(c *gin.Context) {
		var attendance Attendance
		if err := c.ShouldBindJSON(&attendance); err != nil {
			c.JSON(400, gin.H{"success": false, "error": err.Error()})
			return
		}

		if result := db.Create(&attendance); result.Error != nil {
			c.JSON(500, gin.H{"success": false, "error": result.Error.Error()})
			return
		}

		c.JSON(200, gin.H{"success": true, "data": attendance})
	})

	router.Run(":8080")
}
