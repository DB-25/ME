ACHIEVEMENTS = [
    {
        'date': 'Master of Science in Artificial Intelligence',
        'emoji': '🎓',
        'title': 'Master of Science in Artificial Intelligence',
        'institution': 'Northeastern University (NEU)',
        'description': 'Specializing in cutting-edge AI technologies and applications. Expected Graduation: December 2024.',
        'images': []
    },
    {
        'date': 'AWS Generative AI Presentation',
        'emoji': '🎯',
        'title': 'AWS Generative AI Presentation',
        'institution': '',
        'description': 'Delivered a comprehensive presentation on a Generative AI Retrieval-Augmented Generation (RAG) Chatbot, showcasing expertise in AI-driven solutions.',
        'links': [
            {
                'label': 'LinkedIn Post',
                'url': 'https://www.linkedin.com/feed/update/urn:li:activity:7238027177252847616/'
            }
        ],
        'images': [
            'images/aws_presentation1.jpeg',
            'images/aws_presentation2.jpeg'
        ]
    },
    {
        'date': 'State Gen-AI Projects Presentation',
        'emoji': '🤝',
        'title': 'State Gen-AI Projects Presentation to Governor Healey',
        'institution': '',
        'description': 'Worked on state Gen-AI projects and had the opportunity to present the outcomes to Governor Healey.',
        'links': [
            {
                'label': 'Official Announcement',
                'url': 'https://www.mass.gov/news/governor-healey-meets-with-northeastern-students-working-with-administration-on-ai-project-under-innovatema-partnership'
            },
            {
                'label': "Governor Healey's Twitter Post",
                'url': 'https://x.com/MassGovernor/status/1806407066116080012'
            },
            {
                'label': 'GovTech Coverage',
                'url': 'https://www.govtech.com/education/higher-ed/northeastern-university-student-projects-improve-government-with-ai'
            }
        ],
        'images': [
            'images/gov_presentation1.jpeg',
            'images/gov_presentation2.jpg',
            'images/gov_presentation3.jpeg',
        ]
    }
]

# Function to get achievements in reverse chronological order
def get_achievements():
    return sorted(ACHIEVEMENTS, key=lambda x: x['date'], reverse=True) 